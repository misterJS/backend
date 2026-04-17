import { z } from "zod";

export const createGuardianSchema = z.object({
  tripId: z.string().min(1),
  name: z.string().trim().min(2).max(100),
  phoneNumber: z.string().trim().min(8).max(20)
});

export const tripIdParamSchema = z.object({
  tripId: z.string().min(1)
});
