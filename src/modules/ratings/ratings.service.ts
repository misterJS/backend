import { AppError } from "../../common/errors/appError";
import { ratingsRepository } from "./ratings.repository";
import { CreateRatingInput } from "./ratings.types";

export class RatingsService {
  async createRating(userId: string, payload: CreateRatingInput) {
    const trip = await ratingsRepository.findCompletedTripParticipation(payload.tripId);

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
      throw new AppError("Only completed convoy participants can rate", 403);
    }

    if (!participantIds.has(payload.toUserId)) {
      throw new AppError("Target user is not part of this trip", 400);
    }

    if (payload.toUserId === userId) {
      throw new AppError("Cannot rate yourself", 400);
    }

    const existingRating = await ratingsRepository.findExistingRating(
      payload.tripId,
      userId,
      payload.toUserId
    );

    if (existingRating) {
      throw new AppError("You have already rated this user for this trip", 400);
    }

    return ratingsRepository.createRatingAndRefreshUser({
      tripId: payload.tripId,
      fromUserId: userId,
      toUserId: payload.toUserId,
      score: payload.score,
      review: payload.review
    });
  }
}

export const ratingsService = new RatingsService();
