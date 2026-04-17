import { Request, Response } from "express";
import { AppError } from "../../common/errors/appError";
import { asyncHandler } from "../../common/utils/asyncHandler";
import { successResponse } from "../../common/utils/apiResponse";
import { ratingsService } from "./ratings.service";

class RatingsController {
  create = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.currentUser?.userId;
    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    const result = await ratingsService.createRating(userId, req.body);
    res.status(201).json(successResponse("Rating submitted successfully", result));
  });
}

export const ratingsController = new RatingsController();
