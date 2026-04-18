import { z } from "zod";

export const registerPushTokenSchema = z.object({
  expoPushToken: z.string().trim().min(1),
  platform: z.enum(["IOS", "ANDROID"])
});

export const deactivatePushTokenParamsSchema = z.object({
  token: z.string().trim().min(1)
});
