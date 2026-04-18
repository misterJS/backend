import { AppError } from "../../common/errors/appError";
import { signAccessToken } from "../../common/utils/jwt";
import { pushTokensRepository } from "../push-tokens/push-tokens.repository";
import { authRepository } from "./auth.repository";
import { LogoutInput, LogoutResult, RequestOtpInput, VerifyOtpInput, VerifyOtpResult } from "./auth.types";

const OTP_CODE = "123456";
const OTP_EXPIRY_MINUTES = 5;

export class AuthService {
  async requestOtp(payload: RequestOtpInput): Promise<{ phoneNumber: string; expiresInMinutes: number }> {
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    await authRepository.createOtpCode(payload.phoneNumber, OTP_CODE, expiresAt);

    return {
      phoneNumber: payload.phoneNumber,
      expiresInMinutes: OTP_EXPIRY_MINUTES
    };
  }

  async verifyOtp(payload: VerifyOtpInput): Promise<VerifyOtpResult> {
    const latestOtp = await authRepository.findLatestOtpByPhone(payload.phoneNumber);

    if (!latestOtp) {
      throw new AppError("OTP not found", 404);
    }

    if (latestOtp.expiresAt.getTime() < Date.now()) {
      throw new AppError("OTP has expired", 400);
    }

    if (payload.code !== latestOtp.code) {
      throw new AppError("Invalid OTP code", 400);
    }

    const user = await authRepository.findOrCreateUser(payload.phoneNumber);
    const accessToken = signAccessToken({
      userId: user.id,
      phoneNumber: user.phoneNumber
    });

    return {
      accessToken,
      user
    };
  }

  async logout(userId: string, payload: LogoutInput): Promise<LogoutResult> {
    if (!payload.expoPushToken) {
      return {
        loggedOut: true,
        pushTokenDeactivated: false
      };
    }

    const affectedRows = await pushTokensRepository.deactivateByUserAndToken(
      userId,
      payload.expoPushToken
    );

    return {
      loggedOut: true,
      pushTokenDeactivated: affectedRows > 0
    };
  }
}

export const authService = new AuthService();
