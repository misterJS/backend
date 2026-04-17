import { ConvoyStatus, MatchStatus, Prisma, TripStatus } from "@prisma/client";
import { prisma } from "../../prisma/client";

const candidateTripSelect = {
  id: true,
  userId: true,
  startArea: true,
  destinationArea: true,
  vehicleType: true,
  status: true,
  wantsCompanion: true,
  user: {
    select: {
      id: true,
      nickname: true,
      verificationStatus: true,
      vehicleType: true
    }
  }
} satisfies Prisma.TripSelect;

const matchDetailSelect = {
  id: true,
  status: true,
  similarityScore: true,
  meetPointId: true,
  createdAt: true,
  updatedAt: true,
  requesterTrip: {
    select: {
      id: true,
      userId: true,
      startArea: true,
      destinationArea: true,
      vehicleType: true,
      status: true,
      user: {
        select: {
          id: true,
          nickname: true,
          verificationStatus: true
        }
      }
    }
  },
  candidateTrip: {
    select: {
      id: true,
      userId: true,
      startArea: true,
      destinationArea: true,
      vehicleType: true,
      status: true,
      user: {
        select: {
          id: true,
          nickname: true,
          verificationStatus: true
        }
      }
    }
  },
  convoySession: {
    select: {
      id: true,
      status: true,
      startedAt: true,
      endedAt: true
    }
  }
} satisfies Prisma.MatchRequestSelect;

export class MatchingRepository {
  async findTripById(tripId: string) {
    return prisma.trip.findUnique({
      where: { id: tripId },
      select: candidateTripSelect
    });
  }

  async findCandidateTrips(tripId: string, userId: string) {
    return prisma.trip.findMany({
      where: {
        id: { not: tripId },
        userId: { not: userId },
        wantsCompanion: true,
        status: TripStatus.OPEN
      },
      select: candidateTripSelect
    });
  }

  async createMatchRequest(data: {
    requesterTripId: string;
    candidateTripId: string;
    similarityScore: number;
    meetPointId?: string | null;
  }) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const match = await tx.matchRequest.create({
        data: {
          requesterTripId: data.requesterTripId,
          candidateTripId: data.candidateTripId,
          similarityScore: data.similarityScore,
          meetPointId: data.meetPointId ?? null
        },
        select: matchDetailSelect
      });

      return match;
    });
  }

  async findExistingPendingRequest(requesterTripId: string, candidateTripId: string) {
    return prisma.matchRequest.findFirst({
      where: {
        requesterTripId,
        candidateTripId,
        status: MatchStatus.PENDING
      }
    });
  }

  async findMatchById(matchId: string) {
    return prisma.matchRequest.findUnique({
      where: { id: matchId },
      select: matchDetailSelect
    });
  }

  async acceptMatch(matchId: string) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updated = await tx.matchRequest.update({
        where: { id: matchId },
        data: { status: MatchStatus.ACCEPTED },
        select: matchDetailSelect
      });

      return updated;
    });
  }

  async rejectMatch(matchId: string) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updated = await tx.matchRequest.update({
        where: { id: matchId },
        data: { status: MatchStatus.REJECTED },
        select: matchDetailSelect
      });

      return updated;
    });
  }

  async startMatch(matchId: string) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.matchRequest.update({
        where: { id: matchId },
        data: { status: MatchStatus.ACTIVE }
      });

      await tx.convoySession.upsert({
        where: { matchRequestId: matchId },
        create: {
          matchRequestId: matchId,
          status: ConvoyStatus.ACTIVE,
          startedAt: new Date()
        },
        update: {
          status: ConvoyStatus.ACTIVE,
          startedAt: new Date(),
          endedAt: null
        }
      });

      const updated = await tx.matchRequest.findUniqueOrThrow({
        where: { id: matchId },
        select: matchDetailSelect
      });

      await tx.trip.updateMany({
        where: {
          id: {
            in: [updated.requesterTrip.id, updated.candidateTrip.id]
          }
        },
        data: { status: TripStatus.ONGOING }
      });

      return tx.matchRequest.findUniqueOrThrow({
        where: { id: matchId },
        select: matchDetailSelect
      });
    });
  }

  async completeMatch(matchId: string) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.matchRequest.update({
        where: { id: matchId },
        data: { status: MatchStatus.COMPLETED }
      });

      await tx.convoySession.upsert({
        where: { matchRequestId: matchId },
        create: {
          matchRequestId: matchId,
          status: ConvoyStatus.COMPLETED,
          startedAt: new Date(),
          endedAt: new Date()
        },
        update: {
          status: ConvoyStatus.COMPLETED,
          endedAt: new Date()
        }
      });

      const updated = await tx.matchRequest.findUniqueOrThrow({
        where: { id: matchId },
        select: matchDetailSelect
      });

      await tx.trip.updateMany({
        where: {
          id: {
            in: [updated.requesterTrip.id, updated.candidateTrip.id]
          }
        },
        data: { status: TripStatus.COMPLETED }
      });

      return tx.matchRequest.findUniqueOrThrow({
        where: { id: matchId },
        select: matchDetailSelect
      });
    });
  }
}

export const matchingRepository = new MatchingRepository();
