import { AppError } from "../../common/errors/appError";
import { notificationsService } from "../notifications/notifications.service";
import { DeactivatePushTokenParams, RegisterPushTokenInput } from "./push-tokens.types";
import { pushTokensRepository } from "./push-tokens.repository";

export class PushTokensService {
  async registerToken(userId: string, payload: RegisterPushTokenInput) {
    if (!notificationsService.validateExpoPushToken(payload.expoPushToken)) {
      throw new AppError("Invalid Expo push token", 400);
    }

    const tokenRecord = await pushTokensRepository.createOrReactivate(userId, payload);
    console.info("[push-tokens] Registered Expo push token", {
      userId,
      tokenId: tokenRecord.id,
      platform: tokenRecord.platform
    });

    return tokenRecord;
  }

  async deactivateToken(userId: string, params: DeactivatePushTokenParams) {
    const affectedRows = await pushTokensRepository.deactivateByUserAndToken(userId, params.token);

    if (affectedRows === 0) {
      throw new AppError("Push token not found", 404);
    }

    console.info("[push-tokens] Deactivated Expo push token", {
      userId,
      expoPushToken: params.token
    });

    return {
      deactivated: true,
      token: params.token
    };
  }
}

export const pushTokensService = new PushTokensService();
