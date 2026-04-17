import { z } from "zod";

export const createRatingSchema = z.object({
  tripId: z.string().min(1),
  toUserId: z.string().min(1),
  score: z.number().int().min(1).max(5),
  review: z.string().trim().max(500).nullable().optional()
});
