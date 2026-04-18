import { z } from "zod";

export const testNotificationSchema = z.object({
  title: z.string().trim().min(1).max(100).optional(),
  body: z.string().trim().min(1).max(500).optional(),
  data: z.record(z.string(), z.unknown()).optional()
});
