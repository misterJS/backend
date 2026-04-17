import { TripCheckpointSourceType, TripStatus, TripType } from "@prisma/client";
import { AppError } from "../../common/errors/appError";
import { getPagination } from "../../common/utils/pagination";
import { tripLeaderService } from "../users/tripLeader.service";
import { usersRepository } from "../users/users.repository";
import { CreateTripInput, TripsQuery } from "./trips.types";
import { tripsRepository } from "./trips.repository";

export class TripsService {
  async createTrip(userId: string, payload: CreateTripInput) {
    const user = await usersRepository.findById(userId);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    const existingTrip = await tripsRepository.findOpenTripByUserId(userId);

    if (existingTrip) {
      throw new AppError("User already has an active trip", 400);
    }

    const tripType = payload.tripType;
    const tripLeaderStatus = await tripLeaderService.getTripLeaderEligibility(userId);

    if (!tripLeaderStatus) {
      throw new AppError("User trip leader status not found", 404);
    }

    const hasCustomCheckpoint =
      payload.checkpoints?.some(
        (checkpoint) => checkpoint.sourceType === TripCheckpointSourceType.CUSTOM
      ) ?? false;

    if (hasCustomCheckpoint && !tripLeaderStatus.isTripLeaderEligible) {
      throw new AppError(
        "Custom checkpoint area hanya bisa ditambahkan oleh Trip Leader yang eligible.",
        403
      );
    }

    const trip = await tripsRepository.createTrip({
      userId,
      createdById: userId,
      leaderId: userId,
      tripType,
      startArea: payload.startArea,
      destinationArea: payload.destinationArea,
      vehicleType: payload.vehicleType,
      departureTime: new Date(payload.departureTime),
      wantsCompanion: payload.wantsCompanion,
      minParticipants: payload.minParticipants ?? 3,
      maxParticipants: payload.maxParticipants ?? 10,
      checkpoints:
        payload.checkpoints?.map((checkpoint, index) => ({
          title: checkpoint.title,
          subtitle: checkpoint.subtitle,
          area: checkpoint.area,
          scheduledAt: new Date(checkpoint.scheduledAt),
          sourceType: checkpoint.sourceType,
          checkpointType: checkpoint.checkpointType,
          sequence: index + 1
        })) ?? []
    });

    if (tripLeaderService.tripTypeRequiresLeaderEligibility(tripType)) {
      await tripLeaderService.activateLeaderBadgeIfNeeded(userId);
    }

    return trip;
  }

  async getActiveTrips(query: TripsQuery) {
    const pagination = getPagination(query);
    const result = await tripsRepository.listOpenTrips(pagination.skip, pagination.limit);

    return {
      items: result.items,
      meta: {
        page: pagination.page,
        limit: pagination.limit,
        total: result.total
      }
    };
  }

  async getMyTrips(userId: string) {
    return tripsRepository.listTripsByUser(userId);
  }

  async getTripById(tripId: string) {
    const trip = await tripsRepository.findById(tripId);

    if (!trip) {
      throw new AppError("Trip not found", 404);
    }

    return trip;
  }

  async joinTrip(userId: string, tripId: string) {
    const [trip, existingParticipant, existingTrip] = await Promise.all([
      tripsRepository.findById(tripId),
      tripsRepository.findParticipant(tripId, userId),
      tripsRepository.findOpenTripByUserId(userId)
    ]);

    if (!trip) {
      throw new AppError("Trip not found", 404);
    }

    if (trip.status !== TripStatus.OPEN) {
      throw new AppError("Trip tidak bisa di-join pada status saat ini.", 400);
    }

    if (trip.userId === userId) {
      throw new AppError("Leader sudah otomatis menjadi participant trip ini.", 400);
    }

    if (existingParticipant) {
      throw new AppError("User sudah join trip ini.", 400);
    }

    if (existingTrip) {
      throw new AppError("User already has an active trip", 400);
    }

    if (trip.currentParticipants >= trip.maxParticipants) {
      throw new AppError("Trip sudah penuh", 400);
    }

    const joinedTrip = await tripsRepository.joinTrip(tripId, userId);

    if (!joinedTrip) {
      throw new AppError("Trip sudah penuh", 400);
    }

    return joinedTrip;
  }

  async endTrip(userId: string, tripId: string) {
    const trip = await tripsRepository.findById(tripId);

    if (!trip) {
      throw new AppError("Trip not found", 404);
    }

    if (trip.userId !== userId) {
      throw new AppError("Forbidden", 403);
    }

    if (trip.status === TripStatus.COMPLETED || trip.status === TripStatus.CANCELED) {
      throw new AppError("Trip already finished", 400);
    }

    const result = await tripsRepository.updateStatus(tripId, TripStatus.COMPLETED);
    await tripLeaderService.syncParticipantsAfterTripCompletion(tripId, TripStatus.COMPLETED);

    const participantUserIds = await tripsRepository.listParticipantUserIds(tripId);
    await Promise.all(
      participantUserIds.map((participantUserId) =>
        tripLeaderService.refreshUserTripStatsAndEligibility(participantUserId)
      )
    );

    return result;
  }

  async cancelTrip(userId: string, tripId: string) {
    const trip = await tripsRepository.findById(tripId);

    if (!trip) {
      throw new AppError("Trip not found", 404);
    }

    if (trip.userId !== userId) {
      throw new AppError("Forbidden", 403);
    }

    if (trip.status === TripStatus.COMPLETED || trip.status === TripStatus.CANCELED) {
      throw new AppError("Trip already finished", 400);
    }

    const result = await tripsRepository.updateStatus(tripId, TripStatus.CANCELED);
    await tripLeaderService.syncParticipantsAfterTripCompletion(tripId, TripStatus.CANCELED);

    const participantUserIds = await tripsRepository.listParticipantUserIds(tripId);
    await Promise.all(
      participantUserIds.map((participantUserId) =>
        tripLeaderService.refreshUserTripStatsAndEligibility(participantUserId)
      )
    );

    return result;
  }
}

export const tripsService = new TripsService();
