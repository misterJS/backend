import { Prisma } from "@prisma/client";
import { prisma } from "../../prisma/client";
import { RegisterPushTokenInput } from "./push-tokens.types";

const pushTokenSelect = {
  id: true,
  userId: true,
  expoPushToken: true,
  platform: true,
  isActive: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.PushTokenSelect;

export class PushTokensRepository {
  async findByToken(expoPushToken: string) {
    return prisma.pushToken.findUnique({
      where: { expoPushToken },
      select: pushTokenSelect
    });
  }

  async createOrReactivate(userId: string, payload: RegisterPushTokenInput) {
    const existingToken = await this.findByToken(payload.expoPushToken);

    if (existingToken) {
      return prisma.pushToken.update({
        where: { expoPushToken: payload.expoPushToken },
        data: {
          userId,
          platform: payload.platform,
          isActive: true
        },
        select: pushTokenSelect
      });
    }

    return prisma.pushToken.create({
      data: {
        userId,
        expoPushToken: payload.expoPushToken,
        platform: payload.platform,
        isActive: true
      },
      select: pushTokenSelect
    });
  }

  async deactivateByUserAndToken(userId: string, expoPushToken: string) {
    const result = await prisma.pushToken.updateMany({
      where: {
        userId,
        expoPushToken
      },
      data: {
        isActive: false
      }
    });

    return result.count;
  }

  async findActiveTokensByUserId(userId: string) {
    return prisma.pushToken.findMany({
      where: {
        userId,
        isActive: true
      },
      select: pushTokenSelect
    });
  }

  async deactivateTokens(tokens: string[]) {
    if (tokens.length === 0) {
      return 0;
    }

    const result = await prisma.pushToken.updateMany({
      where: {
        expoPushToken: {
          in: tokens
        }
      },
      data: {
        isActive: false
      }
    });

    return result.count;
  }
}

export const pushTokensRepository = new PushTokensRepository();
