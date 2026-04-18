import { Prisma } from "@prisma/client";
import { prisma } from "../../prisma/client";

const authUserSelect = {
  id: true,
  phoneNumber: true,
  nickname: true,
  vehicleType: true,
  verificationStatus: true,
  kycStatus: true,
  tripLeaderBadgeStatus: true,
  ratingAverage: true,
  ratingCount: true,
  tripStats: {
    select: {
      successfulTripCount: true,
      canceledTripCount: true,
      reportedTripCount: true,
      lastTripCompletedAt: true
    }
  },
  createdAt: true,
  updatedAt: true
} satisfies Prisma.UserSelect;

export class AuthRepository {
  async createOtpCode(phoneNumber: string, code: string, expiresAt: Date) {
    return prisma.otpCode.create({
      data: {
        phoneNumber,
        code,
        expiresAt
      }
    });
  }

  async findLatestOtpByPhone(phoneNumber: string) {
    return prisma.otpCode.findFirst({
      where: { phoneNumber },
      orderBy: { createdAt: "desc" }
    });
  }

  async countOtpRequestsSince(phoneNumber: string, since: Date) {
    return prisma.otpCode.count({
      where: {
        phoneNumber,
        createdAt: {
          gte: since
        }
      }
    });
  }

  async findUserByPhoneNumber(phoneNumber: string) {
    return prisma.user.findUnique({
      where: { phoneNumber },
      select: authUserSelect
    });
  }

  async createUser(phoneNumber: string) {
    return prisma.user.create({
      data: { phoneNumber },
      select: authUserSelect
    });
  }

  async findOrCreateUser(phoneNumber: string) {
    const existingUser = await this.findUserByPhoneNumber(phoneNumber);

    if (existingUser) {
      return existingUser;
    }

    return this.createUser(phoneNumber);
  }
}

export const authRepository = new AuthRepository();
