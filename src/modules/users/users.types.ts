import { KycStatus, TripLeaderBadgeStatus, User, VerificationStatus, VehicleType } from "@prisma/client";

export type UpdateProfileInput = {
  nickname?: string;
  vehicleType?: VehicleType;
  verificationStatus?: VerificationStatus;
  kycStatus?: KycStatus;
  isTripLeaderEligible?: boolean;
  tripLeaderBadgeStatus?: TripLeaderBadgeStatus;
};

export type RatingSummary = Pick<User, "id" | "ratingAverage" | "ratingCount">;
