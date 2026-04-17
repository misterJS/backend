import { MatchStatus } from "@prisma/client";
import { AppError } from "../../common/errors/appError";
import { calculateSimilarityScore } from "../../common/utils/matchingScore";
import { tripsRepository } from "../trips/trips.repository";
import { tripLeaderService } from "../users/tripLeader.service";
import { matchingRepository } from "./matching.repository";
import { CreateMatchRequestInput, MatchCandidate } from "./matching.types";

export class MatchingService {
  async getCandidates(userId: string, tripId: string): Promise<MatchCandidate[]> {
    const sourceTrip = await matchingRepository.findTripById(tripId);

    if (!sourceTrip) {
      throw new AppError("Trip not found", 404);
    }

    if (sourceTrip.userId !== userId) {
      throw new AppError("Forbidden", 403);
    }

    const candidateTrips = await matchingRepository.findCandidateTrips(tripId, userId);

    return candidateTrips
      .map((candidate) => ({
        userId: candidate.user.id,
        nickname: candidate.user.nickname,
        verificationStatus: candidate.user.verificationStatus,
        vehicleType: candidate.user.vehicleType,
        tripId: candidate.id,
        similarityScore: calculateSimilarityScore(
          {
            startArea: sourceTrip.startArea,
            destinationArea: sourceTrip.destinationArea,
            vehicleType: sourceTrip.vehicleType
          },
          {
            startArea: candidate.startArea,
            destinationArea: candidate.destinationArea,
            vehicleType: candidate.vehicleType
          }
        )
      }))
      .sort((left, right) => right.similarityScore - left.similarityScore)
      .slice(0, 10);
  }

  async createMatchRequest(userId: string, payload: CreateMatchRequestInput) {
    const [requesterTrip, candidateTrip] = await Promise.all([
      matchingRepository.findTripById(payload.requesterTripId),
      matchingRepository.findTripById(payload.candidateTripId)
    ]);

    if (!requesterTrip || !candidateTrip) {
      throw new AppError("Trip not found", 404);
    }

    if (requesterTrip.userId !== userId) {
      throw new AppError("Forbidden", 403);
    }

    if (requesterTrip.userId === candidateTrip.userId) {
      throw new AppError("Cannot match with your own trip", 400);
    }

    const existingPending = await matchingRepository.findExistingPendingRequest(
      payload.requesterTripId,
      payload.candidateTripId
    );

    if (existingPending) {
      throw new AppError("Pending match request already exists", 400);
    }

    const similarityScore = calculateSimilarityScore(
      {
        startArea: requesterTrip.startArea,
        destinationArea: requesterTrip.destinationArea,
        vehicleType: requesterTrip.vehicleType
      },
      {
        startArea: candidateTrip.startArea,
        destinationArea: candidateTrip.destinationArea,
        vehicleType: candidateTrip.vehicleType
      }
    );

    return matchingRepository.createMatchRequest({
      requesterTripId: payload.requesterTripId,
      candidateTripId: payload.candidateTripId,
      similarityScore,
      meetPointId: payload.meetPointId
    });
  }

  async getMatch(matchId: string) {
    const match = await matchingRepository.findMatchById(matchId);

    if (!match) {
      throw new AppError("Match not found", 404);
    }

    return match;
  }

  async acceptMatch(userId: string, matchId: string) {
    const match = await this.getMatch(matchId);

    if (match.candidateTrip.userId !== userId) {
      throw new AppError("Only candidate trip owner can accept this match", 403);
    }

    if (match.status !== MatchStatus.PENDING) {
      throw new AppError("Match is not pending", 400);
    }

    return matchingRepository.acceptMatch(matchId);
  }

  async rejectMatch(userId: string, matchId: string) {
    const match = await this.getMatch(matchId);

    if (match.candidateTrip.userId !== userId) {
      throw new AppError("Only candidate trip owner can reject this match", 403);
    }

    if (match.status !== MatchStatus.PENDING) {
      throw new AppError("Match is not pending", 400);
    }

    return matchingRepository.rejectMatch(matchId);
  }

  async startConvoy(userId: string, matchId: string) {
    const match = await this.getMatch(matchId);
    const isParticipant =
      match.requesterTrip.userId === userId || match.candidateTrip.userId === userId;

    if (!isParticipant) {
      throw new AppError("Forbidden", 403);
    }

    if (match.status !== MatchStatus.ACCEPTED && match.status !== MatchStatus.ACTIVE) {
      throw new AppError("Match cannot be started", 400);
    }

    return matchingRepository.startMatch(matchId);
  }

  async completeConvoy(userId: string, matchId: string) {
    const match = await this.getMatch(matchId);
    const isParticipant =
      match.requesterTrip.userId === userId || match.candidateTrip.userId === userId;

    if (!isParticipant) {
      throw new AppError("Forbidden", 403);
    }

    if (match.status !== MatchStatus.ACTIVE) {
      throw new AppError("Convoy is not active", 400);
    }

    const completedMatch = await matchingRepository.completeMatch(matchId);

    await Promise.all([
      tripLeaderService.syncParticipantsAfterTripCompletion(
        completedMatch.requesterTrip.id,
        completedMatch.requesterTrip.status
      ),
      tripLeaderService.syncParticipantsAfterTripCompletion(
        completedMatch.candidateTrip.id,
        completedMatch.candidateTrip.status
      )
    ]);

    const participantUserIds = Array.from(
      new Set([
        ...(await tripsRepository.listParticipantUserIds(completedMatch.requesterTrip.id)),
        ...(await tripsRepository.listParticipantUserIds(completedMatch.candidateTrip.id))
      ])
    );

    await Promise.all(
      participantUserIds.map((participantUserId) =>
        tripLeaderService.refreshUserTripStatsAndEligibility(participantUserId)
      )
    );

    return completedMatch;
  }
}

export const matchingService = new MatchingService();
