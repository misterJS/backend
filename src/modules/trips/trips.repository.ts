import { Prisma, TripParticipantRole, TripParticipantStatus, TripStatus, TripType } from "@prisma/client";
import { prisma } from "../../prisma/client";

const tripWithUserSelect = {
  id: true,
  userId: true,
  createdById: true,
  leaderId: true,
  tripType: true,
  startArea: true,
  destinationArea: true,
  vehicleType: true,
  departureTime: true,
  wantsCompanion: true,
  status: true,
  participantCount: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
  checkpoints: {
    orderBy: { sequence: "asc" },
    select: {
      id: true,
      title: true,
      subtitle: true,
      area: true,
      scheduledAt: true,
      sourceType: true,
      checkpointType: true,
      sequence: true
    }
  },
  user: {
    select: {
      id: true,
      nickname: true,
      phoneNumber: true,
      verificationStatus: true,
      vehicleType: true,
      ratingAverage: true,
      ratingCount: true
    }
  },
  leader: {
    select: {
      id: true,
      nickname: true,
      phoneNumber: true,
      verificationStatus: true,
      kycStatus: true,
      tripLeaderBadgeStatus: true,
      vehicleType: true,
      ratingAverage: true,
      ratingCount: true,
      tripStats: {
        select: {
          successfulTripCount: true,
          canceledTripCount: true,
          reportedTripCount: true,
          lastTripCompletedAt: true
        }
      }
    }
  }
} satisfies Prisma.TripSelect;

export class TripsRepository {
  async findOpenTripByUserId(userId: string) {
    return prisma.trip.findFirst({
      where: {
        userId,
        status: {
          in: [TripStatus.ACTIVE, TripStatus.MATCHING, TripStatus.IN_CONVOY]
        }
      }
    });
  }

  async createTrip(data: {
    userId: string;
    createdById: string;
    leaderId: string;
    tripType: TripType;
    startArea: string;
    destinationArea: string;
    vehicleType: Prisma.TripCreateInput["vehicleType"];
    departureTime: Date;
    wantsCompanion: boolean;
    checkpoints: Array<{
      title: string;
      subtitle?: string;
      area: string;
      scheduledAt: Date;
      sourceType: Prisma.TripCheckpointCreateManyTripInput["sourceType"];
      checkpointType: Prisma.TripCheckpointCreateManyTripInput["checkpointType"];
      sequence: number;
    }>;
  }) {
    return prisma.$transaction(async (tx) => {
      const trip = await tx.trip.create({
        data: {
          userId: data.userId,
          createdById: data.createdById,
          leaderId: data.leaderId,
          tripType: data.tripType,
          startArea: data.startArea,
          destinationArea: data.destinationArea,
          vehicleType: data.vehicleType,
          departureTime: data.departureTime,
          wantsCompanion: data.wantsCompanion
        },
        select: tripWithUserSelect
      });

      await tx.tripParticipant.create({
        data: {
          tripId: trip.id,
          userId: data.leaderId,
          status: TripParticipantStatus.JOINED,
          role: TripParticipantRole.LEADER
        }
      });

      if (data.checkpoints.length > 0) {
        await tx.tripCheckpoint.createMany({
          data: data.checkpoints.map((checkpoint) => ({
            tripId: trip.id,
            ...checkpoint
          }))
        });
      }

      return tx.trip.findUniqueOrThrow({
        where: { id: trip.id },
        select: tripWithUserSelect
      });
    });
  }

  async findById(tripId: string) {
    return prisma.trip.findUnique({
      where: { id: tripId },
      select: tripWithUserSelect
    });
  }

  async listOpenTrips(skip: number, take: number) {
    const where = {
      status: {
        in: [TripStatus.ACTIVE, TripStatus.MATCHING, TripStatus.MATCHED, TripStatus.IN_CONVOY]
      }
    };

    const [items, total] = await Promise.all([
      prisma.trip.findMany({
        where,
        skip,
        take,
        orderBy: { departureTime: "asc" },
        select: tripWithUserSelect
      }),
      prisma.trip.count({ where })
    ]);

    return { items, total };
  }

  async listTripsByUser(userId: string) {
    return prisma.trip.findMany({
      where: {
        OR: [{ userId }, { leaderId: userId }]
      },
      orderBy: { createdAt: "desc" },
      select: tripWithUserSelect
    });
  }

  async updateStatus(tripId: string, status: TripStatus) {
    return prisma.trip.update({
      where: { id: tripId },
      data: {
        status,
        completedAt: status === TripStatus.COMPLETED ? new Date() : null
      },
      select: tripWithUserSelect
    });
  }

  async listParticipantUserIds(tripId: string) {
    const participants = await prisma.tripParticipant.findMany({
      where: { tripId },
      select: { userId: true }
    });

    return participants.map((participant) => participant.userId);
  }
}

export const tripsRepository = new TripsRepository();
