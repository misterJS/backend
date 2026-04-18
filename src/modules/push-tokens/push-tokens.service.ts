import { AppError } from "../../common/errors/appError";
import { normalizeExpoPushToken } from "../../common/utils/normalizeExpoPushToken";
import { notificationsService } from "../notifications/notifications.service";
import { DeactivatePushTokenParams, RegisterPushTokenInput } from "./push-tokens.types";
import { pushTokensRepository } from "./push-tokens.repository";

export class PushTokensService {
  async registerToken(userId: string, payload: RegisterPushTokenInput) {
    const normalizedToken = normalizeExpoPushToken(payload.expoPushToken);

    if (!notificationsService.validateExpoPushToken(normalizedToken)) {
      throw new AppError("Invalid Expo push token", 400);
    }

    const tokenRecord = await pushTokensRepository.createOrReactivate(userId, {
      ...payload,
      expoPushToken: normalizedToken
    });
    console.info("[push-tokens] Registered Expo push token", {
      userId,
      tokenId: tokenRecord.id,
      platform: tokenRecord.platform
    });

    return tokenRecord;
  }

  async deactivateToken(userId: string, params: DeactivatePushTokenParams) {
    const normalizedToken = normalizeExpoPushToken(params.token);
    const affectedRows = await pushTokensRepository.deactivateByUserAndToken(userId, normalizedToken);

    if (affectedRows === 0) {
      throw new AppError("Push token not found", 404);
    }

    console.info("[push-tokens] Deactivated Expo push token", {
      userId,
      expoPushToken: params.token
    });

    return {
      deactivated: true,
      token: normalizedToken
    };
  }
}

export const pushTokensService = new PushTokensService();
