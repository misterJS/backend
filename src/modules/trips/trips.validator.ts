import {
  TripCheckpointSourceType,
  TripCheckpointType,
  TripType,
  VehicleType
} from "@prisma/client";
import { z } from "zod";

const createTripCheckpointSchema = z.object({
  title: z.string().trim().min(2).max(80),
  subtitle: z.string().trim().min(2).max(120).optional(),
  area: z.string().trim().min(2).max(100),
  scheduledAt: z.string().datetime(),
  sourceType: z.nativeEnum(TripCheckpointSourceType),
  checkpointType: z.nativeEnum(TripCheckpointType)
});

export const createTripSchema = z.object({
  tripType: z.nativeEnum(TripType),
  startArea: z.string().trim().min(2).max(100),
  destinationArea: z.string().trim().min(2).max(100),
  vehicleType: z.nativeEnum(VehicleType),
  departureTime: z.string().datetime(),
  wantsCompanion: z.boolean(),
  minParticipants: z.coerce.number().int().min(1).max(10).optional(),
  maxParticipants: z.coerce.number().int().min(1).max(10).optional(),
  checkpoints: z.array(createTripCheckpointSchema).max(8).optional()
}).superRefine((payload, context) => {
  if (
    payload.minParticipants !== undefined &&
    payload.maxParticipants !== undefined &&
    payload.minParticipants > payload.maxParticipants
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "minParticipants tidak boleh lebih besar dari maxParticipants.",
      path: ["minParticipants"]
    });
  }
});

export const tripIdParamSchema = z.object({
  tripId: z.string().min(1)
});

export const tripsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional()
});
