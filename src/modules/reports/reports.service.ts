import { AppError } from "../../common/errors/appError";
import { reportsRepository } from "./reports.repository";
import { CreateReportInput } from "./reports.types";

export class ReportsService {
  async createReport(userId: string, payload: CreateReportInput) {
    const trip = await reportsRepository.findTripParticipants(payload.tripId);

    if (!trip) {
      throw new AppError("Trip not found", 404);
    }

    const participantIds = new Set<string>([trip.userId]);

    trip.requesterMatches.forEach((match) => {
      participantIds.add(match.candidateTrip.userId);
    });

    trip.candidateMatches.forEach((match) => {
      participantIds.add(match.requesterTrip.userId);
    });

    if (!participantIds.has(userId)) {
      throw new AppError("Only trip participants can submit a report", 403);
    }

    if (!participantIds.has(payload.reportedUserId)) {
      throw new AppError("Reported user is not part of this trip", 400);
    }

    if (payload.reportedUserId === userId) {
      throw new AppError("Cannot report yourself", 400);
    }

    return reportsRepository.createReport({
      tripId: payload.tripId,
      reporterUserId: userId,
      reportedUserId: payload.reportedUserId,
      reason: payload.reason,
      description: payload.description
    });
  }
}

export const reportsService = new ReportsService();
