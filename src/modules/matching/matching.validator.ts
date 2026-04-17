import { z } from "zod";

export const tripIdParamSchema = z.object({
  tripId: z.string().min(1)
});

export const matchIdParamSchema = z.object({
  matchId: z.string().min(1)
});

export const createMatchRequestSchema = z.object({
  requesterTripId: z.string().min(1),
  candidateTripId: z.string().min(1),
  meetPointId: z.string().min(1).nullable().optional()
});
