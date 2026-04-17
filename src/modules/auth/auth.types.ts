import { User, VerificationStatus, VehicleType } from "@prisma/client";

export type RequestOtpInput = {
  phoneNumber: string;
};

export type VerifyOtpInput = {
  phoneNumber: string;
  code: string;
};

export type AuthUserProfile = Pick<
  User,
  "id" | "phoneNumber" | "nickname" | "vehicleType" | "verificationStatus" | "ratingAverage" | "ratingCount" | "createdAt" | "updatedAt"
> & {
  vehicleType: VehicleType | null;
  verificationStatus: VerificationStatus;
};

export type VerifyOtpResult = {
  accessToken: string;
  user: AuthUserProfile;
};
