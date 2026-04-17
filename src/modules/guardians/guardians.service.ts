import crypto from "node:crypto";
import { AppError } from "../../common/errors/appError";
import { guardiansRepository } from "./guardians.repository";
import { CreateGuardianInput } from "./guardians.types";

export class GuardiansService {
  async createGuardian(userId: string, payload: CreateGuardianInput) {
    const trip = await guardiansRepository.findTripById(payload.tripId);

    if (!trip) {
      throw new AppError("Trip not found", 404);
    }

    if (trip.userId !== userId) {
      throw new AppError("Forbidden", 403);
    }

    const shareToken = crypto.randomBytes(12).toString("hex");
    const guardian = await guardiansRepository.createGuardian({
      tripId: payload.tripId,
      name: payload.name,
      phoneNumber: payload.phoneNumber,
      shareToken
    });

    return {
      ...guardian,
      shareLink: `/guardian/share/${shareToken}`
    };
  }

  async getByTripId(userId: string, tripId: string) {
    const trip = await guardiansRepository.findTripById(tripId);

    if (!trip) {
      throw new AppError("Trip not found", 404);
    }

    if (trip.userId !== userId) {
      throw new AppError("Forbidden", 403);
    }

    return guardiansRepository.findByTripId(tripId);
  }
}

export const guardiansService = new GuardiansService();
