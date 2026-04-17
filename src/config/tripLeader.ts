import { TripType } from "@prisma/client";

export const MIN_SUCCESSFUL_TRIPS_FOR_LEADER = 5;

export const TRIP_TYPES_REQUIRING_LEADER_APPROVAL: TripType[] = [TripType.SCHEDULED];
