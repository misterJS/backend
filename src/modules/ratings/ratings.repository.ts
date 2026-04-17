import { ConvoyStatus, MatchStatus, Prisma } from "@prisma/client";
import { prisma } from "../../prisma/client";

const ratingSelect = {
  id: true,
  tripId: true,
  fromUserId: true,
  toUserId: true,
  score: true,
  review: true,
  createdAt: true
} satisfies Prisma.RatingSelect;

export class RatingsRepository {
  async findCompletedTripParticipation(tripId: string) {
    return prisma.trip.findUnique({
      where: { id: tripId },
      select: {
        id: true,
        userId: true,
        requesterMatches: {
          where: {
            status: MatchStatus.COMPLETED,
            convoySession: {
              is: {
                status: ConvoyStatus.COMPLETED
              }
            }
          },
          select: {
            candidateTrip: {
              select: {
                userId: true
              }
            }
          }
        },
        candidateMatches: {
          where: {
            status: MatchStatus.COMPLETED,
            convoySession: {
              is: {
                status: ConvoyStatus.COMPLETED
              }
            }
          },
          select: {
            requesterTrip: {
              select: {
                userId: true
              }
            }
          }
        }
      }
    });
  }

  async findExistingRating(tripId: string, fromUserId: string, toUserId: string) {
    return prisma.rating.findUnique({
      where: {
        tripId_fromUserId_toUserId: {
          tripId,
          fromUserId,
          toUserId
        }
      }
    });
  }

  async createRatingAndRefreshUser(data: {
    tripId: string;
    fromUserId: string;
    toUserId: string;
    score: number;
    review?: string | null;
  }) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const rating = await tx.rating.create({
        data,
        select: ratingSelect
      });

      const aggregate = await tx.rating.aggregate({
        where: { toUserId: data.toUserId },
        _avg: { score: true },
        _count: { score: true }
      });

      await tx.user.update({
        where: { id: data.toUserId },
        data: {
          ratingAverage: aggregate._avg.score ?? 0,
          ratingCount: aggregate._count.score
        }
      });

      return rating;
    });
  }
}

export const ratingsRepository = new RatingsRepository();
