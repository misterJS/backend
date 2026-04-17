import { Request, Response } from "express";
import { AppError } from "../../common/errors/appError";
import { asyncHandler } from "../../common/utils/asyncHandler";
import { successResponse } from "../../common/utils/apiResponse";
import { tripsService } from "./trips.service";

class TripsController {
  createTrip = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.currentUser?.userId;

    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    const result = await tripsService.createTrip(userId, req.body);
    res.status(201).json(successResponse("Trip created successfully", result));
  });

  getActiveTrips = asyncHandler(async (req: Request, res: Response) => {
    const result = await tripsService.getActiveTrips(req.query);
    res.status(200).json(successResponse("Active trips fetched successfully", result));
  });

  getMyTrips = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.currentUser?.userId;

    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    const result = await tripsService.getMyTrips(userId);
    res.status(200).json(successResponse("My trips fetched successfully", result));
  });

  getTripById = asyncHandler(async (req: Request, res: Response) => {
    const result = await tripsService.getTripById(String(req.params.tripId));
    res.status(200).json(successResponse("Trip fetched successfully", result));
  });

  joinTrip = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.currentUser?.userId;

    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    const result = await tripsService.joinTrip(userId, String(req.params.tripId));
    res.status(200).json(successResponse("Trip joined successfully", result));
  });

  endTrip = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.currentUser?.userId;

    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    const result = await tripsService.endTrip(userId, String(req.params.tripId));
    res.status(200).json(successResponse("Trip ended successfully", result));
  });

  cancelTrip = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.currentUser?.userId;

    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    const result = await tripsService.cancelTrip(userId, String(req.params.tripId));
    res.status(200).json(successResponse("Trip cancelled successfully", result));
  });
}

export const tripsController = new TripsController();
