import { Request, Response } from "express";
import { AppError } from "../../common/errors/appError";
import { asyncHandler } from "../../common/utils/asyncHandler";
import { successResponse } from "../../common/utils/apiResponse";
import { usersService } from "./users.service";

class UsersController {
  getMe = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.currentUser?.userId;

    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    const result = await usersService.getCurrentUser(userId);
    res.status(200).json(successResponse("Current user fetched successfully", result));
  });

  updateMe = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.currentUser?.userId;

    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    const result = await usersService.updateCurrentUser(userId, req.body);
    res.status(200).json(successResponse("Profile updated successfully", result));
  });

  getRatingSummary = asyncHandler(async (req: Request, res: Response) => {
    const result = await usersService.getRatingSummary(String(req.params.userId));
    res.status(200).json(successResponse("Rating summary fetched successfully", result));
  });

  getMyTripLeaderStatus = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.currentUser?.userId;

    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    const result = await usersService.getTripLeaderStatus(userId);
    res.status(200).json(successResponse("Trip leader status fetched successfully", result));
  });

  getUserTripStats = asyncHandler(async (req: Request, res: Response) => {
    const result = await usersService.getUserTripStats(String(req.params.userId));
    res.status(200).json(successResponse("Trip stats fetched successfully", result));
  });
}

export const usersController = new UsersController();
