import { MatchStatus, Prisma } from "@prisma/client";
import { prisma } from "../../prisma/client";

const reportSelect = {
  id: true,
  tripId: true,
  reporterUserId: true,
  reportedUserId: true,
  reason: true,
  description: true,
  createdAt: true
} satisfies Prisma.ReportSelect;

export class ReportsRepository {
  async findTripParticipants(tripId: string) {
    return prisma.trip.findUnique({
      where: { id: tripId },
      select: {
        id: true,
        userId: true,
        requesterMatches: {
          where: {
            status: {
              in: [MatchStatus.ACCEPTED, MatchStatus.ACTIVE, MatchStatus.COMPLETED]
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
            status: {
              in: [MatchStatus.ACCEPTED, MatchStatus.ACTIVE, MatchStatus.COMPLETED]
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

  async createReport(data: {
    tripId: string;
    reporterUserId: string;
    reportedUserId: string;
    reason: string;
    description?: string | null;
  }) {
    return prisma.report.create({
      data,
      select: reportSelect
    });
  }
}

export const reportsRepository = new ReportsRepository();
