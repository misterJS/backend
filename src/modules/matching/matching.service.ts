import { MatchStatus } from "@prisma/client";
import { AppError } from "../../common/errors/appError";
import { calculateSimilarityScore } from "../../common/utils/matchingScore";
import { notificationsService } from "../notifications/notifications.service";
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

    const matchRequest = await matchingRepository.createMatchRequest({
      requesterTripId: payload.requesterTripId,
      candidateTripId: payload.candidateTripId,
      similarityScore,
      meetPointId: payload.meetPointId
    });

    await this.dispatchNotificationSafely(() =>
      notificationsService.sendMatchRequest({
        recipientUserId: candidateTrip.userId,
        matchId: matchRequest.id,
        tripId: candidateTrip.id,
        requesterNickname: requesterTrip.user.nickname
      })
    );

    return matchRequest;
  }

  async getTripRequests(userId: string, tripId: string) {
    const trip = await matchingRepository.findTripById(tripId);

    if (!trip) {
      throw new AppError("Trip not found", 404);
    }

    if (trip.userId !== userId) {
      throw new AppError("Forbidden", 403);
    }

    return matchingRepository.findRequestsByTripId(tripId);
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

    const acceptedMatch = await matchingRepository.acceptMatch(matchId);

    await this.dispatchNotificationSafely(() =>
      notificationsService.sendMatchAccepted({
        recipientUserId: acceptedMatch.requesterTrip.userId,
        matchId: acceptedMatch.id,
        requesterTripId: acceptedMatch.requesterTrip.id,
        candidateTripId: acceptedMatch.candidateTrip.id,
        candidateNickname: acceptedMatch.candidateTrip.user.nickname
      })
    );

    const reminderTargets = [
      acceptedMatch.requesterTrip._count.guardianContacts === 0
        ? {
            recipientUserId: acceptedMatch.requesterTrip.userId,
            tripId: acceptedMatch.requesterTrip.id,
            matchId: acceptedMatch.id
          }
        : null,
      acceptedMatch.candidateTrip._count.guardianContacts === 0
        ? {
            recipientUserId: acceptedMatch.candidateTrip.userId,
            tripId: acceptedMatch.candidateTrip.id,
            matchId: acceptedMatch.id
          }
        : null
    ].filter(Boolean) as Array<{
      recipientUserId: string;
      tripId: string;
      matchId: string;
    }>;

    await Promise.all(
      reminderTargets.map((target) =>
        this.dispatchNotificationSafely(() => notificationsService.sendGuardianReminder(target))
      )
    );

    return acceptedMatch;
  }

  async rejectMatch(userId: string, matchId: string) {
    const match = await this.getMatch(matchId);

    if (match.candidateTrip.userId !== userId) {
      throw new AppError("Only candidate trip owner can reject this match", 403);
    }

    if (match.status !== MatchStatus.PENDING) {
      throw new AppError("Match is not pending", 400);
    }

    const rejectedMatch = await matchingRepository.rejectMatch(matchId);

    await this.dispatchNotificationSafely(() =>
      notificationsService.sendMatchRejected({
        recipientUserId: rejectedMatch.requesterTrip.userId,
        matchId: rejectedMatch.id,
        tripId: rejectedMatch.requesterTrip.id
      })
    );

    return rejectedMatch;
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

    const startedMatch = await matchingRepository.startMatch(matchId);

    await this.dispatchNotificationSafely(() =>
      notificationsService.sendTripStarted({
        recipientUserIds: [startedMatch.requesterTrip.userId, startedMatch.candidateTrip.userId],
        tripId: startedMatch.requesterTrip.id,
        destinationArea: startedMatch.requesterTrip.destinationArea
      })
    );

    return startedMatch;
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

    await this.dispatchNotificationSafely(() =>
      notificationsService.sendTripCompleted({
        recipientUserIds: participantUserIds,
        tripId: completedMatch.requesterTrip.id,
        destinationArea: completedMatch.requesterTrip.destinationArea
      })
    );

    return completedMatch;
  }

  private async dispatchNotificationSafely(action: () => Promise<unknown>) {
    try {
      await action();
    } catch (error) {
      console.error("[notifications] Failed to dispatch matching event notification", error);
    }
  }
}

export const matchingService = new MatchingService();
