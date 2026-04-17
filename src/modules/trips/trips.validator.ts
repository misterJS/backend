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
  tripType: z.nativeEnum(TripType).default(TripType.REALTIME),
  startArea: z.string().trim().min(2).max(100),
  destinationArea: z.string().trim().min(2).max(100),
  vehicleType: z.nativeEnum(VehicleType),
  departureTime: z.string().datetime(),
  wantsCompanion: z.boolean(),
  checkpoints: z.array(createTripCheckpointSchema).max(8).optional()
});

export const tripIdParamSchema = z.object({
  tripId: z.string().min(1)
});

export const tripsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional()
});
