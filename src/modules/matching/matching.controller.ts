import { Request, Response } from "express";
import { AppError } from "../../common/errors/appError";
import { asyncHandler } from "../../common/utils/asyncHandler";
import { successResponse } from "../../common/utils/apiResponse";
import { matchingService } from "./matching.service";

class MatchingController {
  getCandidates = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.currentUser?.userId;
    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    const result = await matchingService.getCandidates(userId, String(req.params.tripId));
    res.status(200).json(successResponse("Candidates fetched successfully", result));
  });

  getTripRequests = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.currentUser?.userId;
    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    const result = await matchingService.getTripRequests(userId, String(req.params.tripId));
    res.status(200).json(successResponse("Trip requests fetched successfully", result));
  });

  createRequest = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.currentUser?.userId;
    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    const result = await matchingService.createMatchRequest(userId, req.body);
    res.status(201).json(successResponse("Match request created successfully", result));
  });

  accept = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.currentUser?.userId;
    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    const result = await matchingService.acceptMatch(userId, String(req.params.matchId));
    res.status(200).json(successResponse("Match accepted successfully", result));
  });

  reject = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.currentUser?.userId;
    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    const result = await matchingService.rejectMatch(userId, String(req.params.matchId));
    res.status(200).json(successResponse("Match rejected successfully", result));
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    const result = await matchingService.getMatch(String(req.params.matchId));
    res.status(200).json(successResponse("Match detail fetched successfully", result));
  });

  start = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.currentUser?.userId;
    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    const result = await matchingService.startConvoy(userId, String(req.params.matchId));
    res.status(200).json(successResponse("Convoy started successfully", result));
  });

  complete = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.currentUser?.userId;
    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    const result = await matchingService.completeConvoy(userId, String(req.params.matchId));
    res.status(200).json(successResponse("Convoy completed successfully", result));
  });
}

export const matchingController = new MatchingController();
