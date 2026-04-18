import { NotificationStatus } from "@prisma/client";
import { z } from "zod";

const notificationIdSchema = z.object({
  id: z.string().min(1)
});

export const getNotificationsQuerySchema = z.object({
  tab: z.enum(["activity", "new_matched", "archive"]).optional(),
  status: z.nativeEnum(NotificationStatus).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  cursor: z.string().min(1).optional()
});

export const testNotificationSchema = z.object({
  title: z.string().trim().min(1).max(100).optional(),
  body: z.string().trim().min(1).max(500).optional(),
  data: z.record(z.string(), z.unknown()).optional()
});

export const notificationIdParamSchema = notificationIdSchema;
