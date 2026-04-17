import { Request, Response } from "express";
import { AppError } from "../../common/errors/appError";
import { asyncHandler } from "../../common/utils/asyncHandler";
import { successResponse } from "../../common/utils/apiResponse";
import { reportsService } from "./reports.service";

class ReportsController {
  create = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.currentUser?.userId;
    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    const result = await reportsService.createReport(userId, req.body);
    res.status(201).json(successResponse("Report submitted successfully", result));
  });
}

export const reportsController = new ReportsController();
