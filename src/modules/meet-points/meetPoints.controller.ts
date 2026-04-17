import { Request, Response } from "express";
import { asyncHandler } from "../../common/utils/asyncHandler";
import { successResponse } from "../../common/utils/apiResponse";
import { meetPointsService } from "./meetPoints.service";

class MeetPointsController {
  getAll = asyncHandler(async (_req: Request, res: Response) => {
    const result = meetPointsService.getAll();
    res.status(200).json(successResponse("Meet points fetched successfully", result));
  });

  getAreaOptions = asyncHandler(async (req: Request, res: Response) => {
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const result = meetPointsService.getAreaOptions(search);
    res.status(200).json(successResponse("Area options fetched successfully", result));
  });

  getRecommendations = asyncHandler(async (req: Request, res: Response) => {
    const area = typeof req.query.area === "string" ? req.query.area : undefined;
    const result = meetPointsService.getRecommendations(area);
    res.status(200).json(successResponse("Meet point recommendations fetched successfully", result));
  });

  getTripLeaderRouteRecommendations = asyncHandler(async (req: Request, res: Response) => {
    const result = meetPointsService.getTripLeaderRouteRecommendations({
      startArea: String(req.query.startArea),
      destinationArea: String(req.query.destinationArea),
      departureTime: typeof req.query.departureTime === "string" ? req.query.departureTime : undefined
    });
    res
      .status(200)
      .json(successResponse("Trip leader route recommendations fetched successfully", result));
  });
}

export const meetPointsController = new MeetPointsController();
