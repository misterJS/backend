import { NextFunction, Request, Response } from "express";
import { TripType } from "@prisma/client";
import { AppError } from "../errors/appError";
import { tripLeaderService } from "../../modules/users/tripLeader.service";

export const tripLeaderEligibilityGuard = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.currentUser?.userId;

    if (!userId) {
      next(new AppError("Unauthorized", 401));
      return;
    }

    const tripType = req.body.tripType as TripType | undefined;

    if (!tripType) {
      next(new AppError("tripType wajib diisi.", 400));
      return;
    }

    const status = await tripLeaderService.ensureUserTripLeaderEligibility(userId, tripType);

    if (status && !status.isTripLeaderEligible) {
      next(
        new AppError(
          status.message || "User belum eligible menjadi Trip Leader untuk tipe trip ini.",
          403
        )
      );
      return;
    }

    next();
  } catch (error) {
    next(error);
    return;
  }
};
