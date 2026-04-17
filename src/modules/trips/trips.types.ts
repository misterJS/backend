import {
  TripCheckpointSourceType,
  TripCheckpointType,
  TripStatus,
  TripType,
  VehicleType
} from "@prisma/client";

export type CreateTripCheckpointInput = {
  title: string;
  subtitle?: string;
  area: string;
  scheduledAt: string;
  sourceType: TripCheckpointSourceType;
  checkpointType: TripCheckpointType;
};

export type CreateTripInput = {
  tripType: TripType;
  startArea: string;
  destinationArea: string;
  vehicleType: VehicleType;
  departureTime: string;
  wantsCompanion: boolean;
  minParticipants?: number;
  maxParticipants?: number;
  checkpoints?: CreateTripCheckpointInput[];
};

export type TripsQuery = {
  page?: number;
  limit?: number;
};

export type EndTripParams = {
  tripId: string;
};

export type TripListItem = {
  id: string;
  userId: string;
  startArea: string;
  destinationArea: string;
  vehicleType: VehicleType;
  departureTime: Date;
  wantsCompanion: boolean;
  status: TripStatus;
  createdAt: Date;
  updatedAt: Date;
};
