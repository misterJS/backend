import { TripCheckpointSourceType, TripCheckpointType } from "@prisma/client";

export type MeetPoint = {
  id: string;
  name: string;
  type: string;
  address: string;
  latitude: number;
  longitude: number;
  area: string;
};

export type RouteCheckpointRecommendation = {
  id: string;
  title: string;
  subtitle: string;
  area: string;
  scheduledAt: string;
  sourceType: TripCheckpointSourceType;
  checkpointType: TripCheckpointType;
};

export type TripLeaderRouteRecommendationsResponse = {
  availableAreas: string[];
  checkpoints: RouteCheckpointRecommendation[];
};
