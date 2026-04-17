import { z } from "zod";

export const createReportSchema = z.object({
  tripId: z.string().min(1),
  reportedUserId: z.string().min(1),
  reason: z.string().trim().min(3).max(120),
  description: z.string().trim().max(500).nullable().optional()
});
