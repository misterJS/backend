import { AppError } from "../../common/errors/appError";
import { notificationsService } from "../notifications/notifications.service";
import { usersRepository } from "./users.repository";
import { tripLeaderService } from "./tripLeader.service";
import { UpdateProfileInput } from "./users.types";

export class UsersService {
  async getCurrentUser(userId: string) {
    await tripLeaderService.refreshUserTripStatsAndEligibility(userId);
    const user = await usersRepository.findById(userId);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    return user;
  }

  async updateCurrentUser(userId: string, payload: UpdateProfileInput) {
    const currentUser = await this.getCurrentUser(userId);
    const updatedUser = await usersRepository.updateById(userId, payload);

    const becameVerified =
      (currentUser.kycStatus !== "VERIFIED" && updatedUser.kycStatus === "VERIFIED") ||
      (currentUser.verificationStatus === "UNVERIFIED" &&
        updatedUser.verificationStatus !== "UNVERIFIED");

    if (becameVerified) {
      try {
        await notificationsService.sendAccountVerified({
          recipientUserId: userId
        });
      } catch (error) {
        console.error("[notifications] Failed to dispatch account verified notification", error);
      }
    }

    return updatedUser;
  }

  async getRatingSummary(userId: string) {
    const summary = await usersRepository.findRatingSummary(userId);

    if (!summary) {
      throw new AppError("User not found", 404);
    }

    return summary;
  }

  async getTripLeaderStatus(userId: string) {
    const status = await tripLeaderService.refreshUserTripStatsAndEligibility(userId);

    if (!status) {
      throw new AppError("User not found", 404);
    }

    return status;
  }

  async getUserTripStats(userId: string) {
    const stats = await tripLeaderService.refreshUserTripStatsAndEligibility(userId);

    if (!stats) {
      throw new AppError("User not found", 404);
    }

    return tripLeaderService.getUserTripStats(userId);
  }
}

export const usersService = new UsersService();
