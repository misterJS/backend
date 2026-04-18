import { Request, Response } from "express";
import { AppError } from "../../common/errors/appError";
import { asyncHandler } from "../../common/utils/asyncHandler";
import { successResponse } from "../../common/utils/apiResponse";
import { authService } from "./auth.service";

class AuthController {
  requestOtp = asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.requestOtp(req.body);
    res.status(200).json(successResponse("OTP requested successfully", result));
  });

  verifyOtp = asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.verifyOtp(req.body);
    res.status(200).json(successResponse("OTP verified successfully", result));
  });

  logout = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.currentUser?.userId;

    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    const result = await authService.logout(userId, req.body);
    res.status(200).json(successResponse("Logged out successfully", result));
  });
}

export const authController = new AuthController();
