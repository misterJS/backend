import { z } from "zod";

export const requestOtpSchema = z.object({
  phoneNumber: z.string().min(8).max(20)
});

export const verifyOtpSchema = z.object({
  phoneNumber: z.string().min(8).max(20),
  code: z.string().length(6)
});
