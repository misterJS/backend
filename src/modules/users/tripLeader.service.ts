import {
  KycStatus,
  Prisma,
  ReportSeverity,
  TripLeaderBadgeStatus,
  TripParticipantRole,
  TripParticipantStatus,
  TripStatus,
  TripType
} from "@prisma/client";
import { prisma } from "../../prisma/client";
import {
  MIN_SUCCESSFUL_TRIPS_FOR_LEADER,
  TRIP_TYPES_REQUIRING_LEADER_APPROVAL
} from "../../config/tripLeader";

const tripLeaderStatusSelect = {
  id: true,
  nickname: true,
  phoneNumber: true,
  vehicleType: true,
  verificationStatus: true,
  kycStatus: true,
  isTripLeaderEligible: true,
  tripLeaderBadgeStatus: true,
  ratingAverage: true,
  ratingCount: true,
  createdAt: true,
  updatedAt: true,
  tripStats: {
    select: {
      successfulTripCount: true,
      canceledTripCount: true,
      reportedTripCount: true,
      lastTripCompletedAt: true
    }
  }
} satisfies Prisma.UserSelect;

const activeLeaderTripStatuses: TripStatus[] = [
  TripStatus.OPEN,
  TripStatus.ONGOING
];

type TripLeaderContext = Prisma.UserGetPayload<{
  select: typeof tripLeaderStatusSelect;
}>;

export class TripLeaderService {
  getMinimumSuccessfulTrips() {
    return MIN_SUCCESSFUL_TRIPS_FOR_LEADER;
  }

  tripTypeRequiresLeaderEligibility(tripType: TripType) {
    return TRIP_TYPES_REQUIRING_LEADER_APPROVAL.includes(tripType);
  }

  async getUserTripLeaderContext(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: tripLeaderStatusSelect
    });
  }

  evaluateEligibility(input: {
    kycStatus: KycStatus;
    successfulTripCount: number;
    tripLeaderBadgeStatus: TripLeaderBadgeStatus;
  }) {
    const reasons: string[] = [];
    const progress = {
      kycVerified: input.kycStatus === KycStatus.VERIFIED,
      successfulTrips: input.successfulTripCount,
      minimumSuccessfulTrips: MIN_SUCCESSFUL_TRIPS_FOR_LEADER
    };

    if (input.tripLeaderBadgeStatus === TripLeaderBadgeStatus.SUSPENDED) {
      reasons.push("Status Trip Leader sedang disuspensi dan perlu review admin.");
    }

    if (input.kycStatus !== KycStatus.VERIFIED) {
      reasons.push("KYC harus verified sebelum bisa menjadi Trip Leader.");
    }

    if (input.successfulTripCount < MIN_SUCCESSFUL_TRIPS_FOR_LEADER) {
      const remaining = MIN_SUCCESSFUL_TRIPS_FOR_LEADER - input.successfulTripCount;
      reasons.push(`Butuh ${remaining} trip berhasil lagi untuk memenuhi syarat minimum.`);
    }

    const isEligible =
      input.tripLeaderBadgeStatus !== TripLeaderBadgeStatus.SUSPENDED &&
      input.kycStatus === KycStatus.VERIFIED &&
      input.successfulTripCount >= MIN_SUCCESSFUL_TRIPS_FOR_LEADER;

    return {
      isEligible,
      reasons,
      message: isEligible
        ? "Kamu sudah memenuhi syarat menjadi Trip Leader."
        : reasons.join(" "),
      progress
    };
  }

  async getTripLeaderStatus(userId: string) {
    const user = await this.getUserTripLeaderContext(userId);

    if (!user) {
      return null;
    }

    const successfulTripCount = user.tripStats?.successfulTripCount ?? 0;
    const evaluation = this.evaluateEligibility({
      kycStatus: user.kycStatus,
      successfulTripCount,
      tripLeaderBadgeStatus: user.tripLeaderBadgeStatus
    });

    return {
      userId: user.id,
      kycStatus: user.kycStatus,
      successfulTripCount,
      canceledTripCount: user.tripStats?.canceledTripCount ?? 0,
      reportedTripCount: user.tripStats?.reportedTripCount ?? 0,
      lastTripCompletedAt: user.tripStats?.lastTripCompletedAt ?? null,
      minRequiredSuccessfulTrips: MIN_SUCCESSFUL_TRIPS_FOR_LEADER,
      isTripLeaderEligible: evaluation.isEligible,
      tripLeaderBadgeStatus: user.tripLeaderBadgeStatus,
      message: evaluation.message,
      reasons: evaluation.reasons,
      progress: evaluation.progress
    };
  }

  async refreshUserTripStatsAndEligibility(userId: string) {
    const [successfulTripCount, canceledTripCount, reportedTripCount, lastCompletedTrip, user] =
      await Promise.all([
        prisma.tripParticipant.count({
          where: {
            userId,
            status: TripParticipantStatus.COMPLETED,
            trip: {
              status: TripStatus.COMPLETED,
              currentParticipants: {
                gte: prisma.trip.fields.minParticipants
              },
              reports: {
                none: {
                  reportedUserId: userId,
                  severity: ReportSeverity.SEVERE
                }
              }
            }
          }
        }),
        prisma.tripParticipant.count({
          where: {
            userId,
            OR: [
              { status: TripParticipantStatus.CANCELLED },
              { trip: { status: TripStatus.CANCELED } }
            ]
          }
        }),
        prisma.tripParticipant.count({
          where: {
            userId,
            trip: {
              reports: {
                some: {
                  reportedUserId: userId,
                  severity: ReportSeverity.SEVERE
                }
              }
            }
          }
        }),
        prisma.tripParticipant.findFirst({
          where: {
            userId,
            status: TripParticipantStatus.COMPLETED,
            trip: { status: TripStatus.COMPLETED }
          },
          orderBy: { completedAt: "desc" },
          select: { completedAt: true }
        }),
        prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            kycStatus: true,
            isTripLeaderEligible: true,
            tripLeaderBadgeStatus: true
          }
        })
      ]);

    if (!user) {
      return null;
    }

    const activeLeaderTripCount = await prisma.trip.count({
      where: {
        leaderId: userId,
        tripType: TripType.SCHEDULED,
        status: { in: activeLeaderTripStatuses }
      }
    });

    const evaluation = this.evaluateEligibility({
      kycStatus: user.kycStatus,
      successfulTripCount,
      tripLeaderBadgeStatus: user.tripLeaderBadgeStatus
    });

    const nextBadgeStatus =
      user.tripLeaderBadgeStatus === TripLeaderBadgeStatus.SUSPENDED
        ? TripLeaderBadgeStatus.SUSPENDED
        : evaluation.isEligible
          ? activeLeaderTripCount > 0
            ? TripLeaderBadgeStatus.ACTIVE
            : TripLeaderBadgeStatus.ELIGIBLE
          : TripLeaderBadgeStatus.NONE;

    await prisma.$transaction([
      prisma.userTripStats.upsert({
        where: { userId },
        update: {
          successfulTripCount,
          canceledTripCount,
          reportedTripCount,
          lastTripCompletedAt: lastCompletedTrip?.completedAt ?? null
        },
        create: {
          userId,
          successfulTripCount,
          canceledTripCount,
          reportedTripCount,
          lastTripCompletedAt: lastCompletedTrip?.completedAt ?? null
        }
      }),
      prisma.user.update({
        where: { id: userId },
        data: {
          isTripLeaderEligible: evaluation.isEligible,
          tripLeaderBadgeStatus: nextBadgeStatus
        }
      })
    ]);

    return this.getTripLeaderStatus(userId);
  }

  async ensureUserTripLeaderEligibility(userId: string, tripType: TripType) {
    if (!this.tripTypeRequiresLeaderEligibility(tripType)) {
      return null;
    }

    const status = await this.refreshUserTripStatsAndEligibility(userId);

    if (!status) {
      return null;
    }

    if (!status.isTripLeaderEligible) {
      return status;
    }

    return status;
  }

  async getTripLeaderEligibility(userId: string) {
    return this.refreshUserTripStatsAndEligibility(userId);
  }

  async getUserTripStats(userId: string) {
    const [user, status] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          nickname: true,
          kycStatus: true,
          tripLeaderBadgeStatus: true
        }
      }),
      this.getTripLeaderStatus(userId)
    ]);

    if (!user || !status) {
      return null;
    }

    return {
      userId: user.id,
      nickname: user.nickname,
      kycStatus: user.kycStatus,
      tripLeaderBadgeStatus: user.tripLeaderBadgeStatus,
      successfulTripCount: status.successfulTripCount,
      canceledTripCount: status.canceledTripCount,
      reportedTripCount: status.reportedTripCount,
      lastTripCompletedAt: status.lastTripCompletedAt,
      isTripLeaderEligible: status.isTripLeaderEligible
    };
  }

  async activateLeaderBadgeIfNeeded(userId: string) {
    const activeLeaderTripCount = await prisma.trip.count({
      where: {
        leaderId: userId,
        tripType: TripType.SCHEDULED,
        status: { in: activeLeaderTripStatuses }
      }
    });

    await prisma.user.update({
      where: { id: userId },
      data: {
        isTripLeaderEligible: true,
        tripLeaderBadgeStatus:
          activeLeaderTripCount > 0
            ? TripLeaderBadgeStatus.ACTIVE
            : TripLeaderBadgeStatus.ELIGIBLE
      }
    });
  }

  async syncParticipantsAfterTripCompletion(tripId: string, tripStatus: TripStatus) {
    const participantStatus =
      tripStatus === TripStatus.COMPLETED
        ? TripParticipantStatus.COMPLETED
        : TripParticipantStatus.CANCELLED;

    await prisma.tripParticipant.updateMany({
      where: {
        tripId,
        status: TripParticipantStatus.JOINED
      },
      data: {
        status: participantStatus,
        completedAt: tripStatus === TripStatus.COMPLETED ? new Date() : null
      }
    });
  }

  async createLeaderParticipant(tx: Prisma.TransactionClient, tripId: string, userId: string) {
    await tx.tripParticipant.create({
      data: {
        tripId,
        userId,
        role: TripParticipantRole.LEADER,
        status: TripParticipantStatus.JOINED
      }
    });
  }
}

export const tripLeaderService = new TripLeaderService();
