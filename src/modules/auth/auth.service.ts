import { AppError } from "../../common/errors/appError";
import { signAccessToken } from "../../common/utils/jwt";
import { pushTokensRepository } from "../push-tokens/push-tokens.repository";
import { authRepository } from "./auth.repository";
import { LogoutInput, LogoutResult, RequestOtpInput, VerifyOtpInput, VerifyOtpResult } from "./auth.types";

const OTP_CODE = "123456";
const OTP_EXPIRY_MINUTES = 5;
const OTP_REQUEST_COOLDOWN_SECONDS = 60;
const OTP_REQUEST_WINDOW_MINUTES = 15;
const OTP_REQUEST_MAX_PER_WINDOW = 3;

export class AuthService {
  async requestOtp(payload: RequestOtpInput): Promise<{ phoneNumber: string; expiresInMinutes: number }> {
    const now = Date.now();
    const latestOtp = await authRepository.findLatestOtpByPhone(payload.phoneNumber);

    if (latestOtp) {
      const secondsSinceLastRequest = Math.floor((now - latestOtp.createdAt.getTime()) / 1000);

      if (secondsSinceLastRequest < OTP_REQUEST_COOLDOWN_SECONDS) {
        const retryAfterSeconds = OTP_REQUEST_COOLDOWN_SECONDS - secondsSinceLastRequest;
        throw new AppError(
          `OTP baru saja dikirim. Coba lagi dalam ${retryAfterSeconds} detik.`,
          429,
          {
            code: "OTP_COOLDOWN_ACTIVE",
            retryAfterSeconds
          }
        );
      }
    }

    const windowStart = new Date(now - OTP_REQUEST_WINDOW_MINUTES * 60 * 1000);
    const recentRequestCount = await authRepository.countOtpRequestsSince(
      payload.phoneNumber,
      windowStart
    );

    if (recentRequestCount >= OTP_REQUEST_MAX_PER_WINDOW) {
      throw new AppError(
        `Batas permintaan OTP tercapai. Maksimal ${OTP_REQUEST_MAX_PER_WINDOW} kali dalam ${OTP_REQUEST_WINDOW_MINUTES} menit.`,
        429,
        {
          code: "OTP_REQUEST_LIMIT_REACHED",
          limit: OTP_REQUEST_MAX_PER_WINDOW,
          windowMinutes: OTP_REQUEST_WINDOW_MINUTES
        }
      );
    }

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
