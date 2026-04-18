import { PushPlatform } from "@prisma/client";

export type RegisterPushTokenInput = {
  expoPushToken: string;
  platform: PushPlatform;
};

export type DeactivatePushTokenParams = {
  token: string;
};

export type PushTokenDto = {
  id: string;
  userId: string;
  expoPushToken: string;
  platform: PushPlatform;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};
