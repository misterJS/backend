import { Prisma } from "@prisma/client";
import { prisma } from "../../prisma/client";
import { UpdateProfileInput } from "./users.types";

const userSelect = {
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

export class UsersRepository {
  async findById(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: userSelect
    });
  }

  async updateById(userId: string, payload: UpdateProfileInput) {
    return prisma.user.update({
      where: { id: userId },
      data: payload,
      select: userSelect
    });
  }

  async findRatingSummary(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        ratingAverage: true,
        ratingCount: true
      }
    });
  }
}

export const usersRepository = new UsersRepository();
