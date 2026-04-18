import { Request, Response } from "express";
import { AppError } from "../../common/errors/appError";
import { asyncHandler } from "../../common/utils/asyncHandler";
import { successResponse } from "../../common/utils/apiResponse";
import { pushTokensService } from "./push-tokens.service";
import { DeactivatePushTokenParams } from "./push-tokens.types";

class PushTokensController {
  register = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.currentUser?.userId;
    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    const result = await pushTokensService.registerToken(userId, req.body);
    res.status(201).json(successResponse("Push token registered successfully", result));
  });

  deactivate = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.currentUser?.userId;
    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    const result = await pushTokensService.deactivateToken(
      userId,
      req.params as DeactivatePushTokenParams
    );
    res.json(successResponse("Push token deactivated successfully", result));
  });
}

export const pushTokensController = new PushTokensController();
