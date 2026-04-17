import { Prisma } from "@prisma/client";
import { prisma } from "../../prisma/client";

const guardianSelect = {
  id: true,
  tripId: true,
  name: true,
  phoneNumber: true,
  shareToken: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.GuardianContactSelect;

export class GuardiansRepository {
  async findTripById(tripId: string) {
    return prisma.trip.findUnique({
      where: { id: tripId },
      select: {
        id: true,
        userId: true,
        status: true
      }
    });
  }

  async createGuardian(data: {
    tripId: string;
    name: string;
    phoneNumber: string;
    shareToken: string;
  }) {
    return prisma.guardianContact.create({
      data,
      select: guardianSelect
    });
  }

  async findByTripId(tripId: string) {
    return prisma.guardianContact.findMany({
      where: { tripId },
      orderBy: { createdAt: "desc" },
      select: guardianSelect
    });
  }
}

export const guardiansRepository = new GuardiansRepository();
