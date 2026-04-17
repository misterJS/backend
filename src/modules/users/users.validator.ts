import { KycStatus, TripLeaderBadgeStatus, VerificationStatus, VehicleType } from "@prisma/client";
import { z } from "zod";

export const updateProfileSchema = z
  .object({
    nickname: z.string().trim().min(1).max(50).optional(),
    vehicleType: z.nativeEnum(VehicleType).optional(),
    verificationStatus: z.nativeEnum(VerificationStatus).optional(),
    kycStatus: z.nativeEnum(KycStatus).optional(),
    tripLeaderBadgeStatus: z.nativeEnum(TripLeaderBadgeStatus).optional()
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required"
  });

export const userIdParamSchema = z.object({
  userId: z.string().min(1)
});
