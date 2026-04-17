import { AreaLevel, DirectoryEntrySource, TripCheckpointSourceType, TripCheckpointType } from "@prisma/client";

export type AreaOption = {
  id: string;
  label: string;
  value: string;
  adminCode?: string | null;
  description?: string | null;
  level: AreaLevel;
  parentId?: string | null;
  provinceCode?: string | null;
  cityCode?: string | null;
  districtCode?: string | null;
  villageCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  source: DirectoryEntrySource;
};

export type MeetPoint = {
  id: string;
  name: string;
  type: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  areaId?: string | null;
  area: string;
  source: DirectoryEntrySource;
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
  availableAreas: AreaOption[];
  checkpoints: RouteCheckpointRecommendation[];
};

export type AreaLocationSuggestion = AreaOption & {
  distanceKm: number | null;
  matchedBy: "AREA_DIRECTORY" | "MEET_POINT";
};

export type SuggestAreaFromLocationResponse = {
  primary: AreaLocationSuggestion | null;
  suggestions: AreaLocationSuggestion[];
};

export type CreateAreaInput = {
  label: string;
  description?: string;
  level?: AreaLevel;
  latitude?: number | null;
  longitude?: number | null;
  provinceCode?: string;
  cityCode?: string;
  districtCode?: string;
  villageCode?: string;
  adminCode?: string;
  source?: Extract<DirectoryEntrySource, "DEVICE_LOCATION" | "USER_INPUT">;
};

export type CreateMeetPointInput = {
  name: string;
  type?: string;
  address: string;
  area: string;
  latitude?: number | null;
  longitude?: number | null;
};
