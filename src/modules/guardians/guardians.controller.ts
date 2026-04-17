import { Request, Response } from "express";
import { AppError } from "../../common/errors/appError";
import { asyncHandler } from "../../common/utils/asyncHandler";
import { successResponse } from "../../common/utils/apiResponse";
import { guardiansService } from "./guardians.service";

class GuardiansController {
  create = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.currentUser?.userId;
    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    const result = await guardiansService.createGuardian(userId, req.body);
    res.status(201).json(successResponse("Guardian contact created successfully", result));
  });

  getByTripId = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.currentUser?.userId;
    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    const result = await guardiansService.getByTripId(userId, String(req.params.tripId));
    res.status(200).json(successResponse("Guardian contacts fetched successfully", result));
  });
}

export const guardiansController = new GuardiansController();
