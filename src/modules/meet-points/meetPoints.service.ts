import {
  AreaLevel,
  DirectoryEntrySource,
  Prisma,
  TripCheckpointSourceType,
  TripCheckpointType
} from "@prisma/client";
import { prisma } from "../../prisma/client";
import { AppError } from "../../common/errors/appError";
import {
  AreaLocationSuggestion,
  AreaOption,
  CreateAreaInput,
  CreateMeetPointInput,
  MeetPoint,
  RouteCheckpointRecommendation,
  SuggestAreaFromLocationResponse,
  TripLeaderRouteRecommendationsResponse
} from "./meetPoints.types";

const DEFAULT_AREA_OPTIONS_LIMIT = 20;
const MAX_AREA_OPTIONS_LIMIT = 50;
const DEFAULT_SUGGESTIONS_LIMIT = 5;
const MAX_SUGGESTIONS_LIMIT = 20;
const DEFAULT_NEARBY_DUPLICATE_RADIUS_KM = 1.5;
const DEFAULT_LOCATION_MATCH_RADIUS_KM = 25;

const normalizeLabel = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

const normalizeAdminCode = (value?: string | null) => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  const digitsOnly = trimmed.replace(/\D/g, "");

  if (/^\d+$/.test(trimmed) && digitsOnly.length >= 2) {
    if (digitsOnly.length <= 2) {
      return digitsOnly;
    }

    if (digitsOnly.length <= 4) {
      return `${digitsOnly.slice(0, 2)}.${digitsOnly.slice(2)}`;
    }

    if (digitsOnly.length <= 6) {
      return `${digitsOnly.slice(0, 2)}.${digitsOnly.slice(2, 4)}.${digitsOnly.slice(4)}`;
    }

    return `${digitsOnly.slice(0, 2)}.${digitsOnly.slice(2, 4)}.${digitsOnly.slice(4, 6)}.${digitsOnly.slice(6)}`;
  }

  return trimmed
    .replace(/[/-]+/g, ".")
    .replace(/\.+/g, ".")
    .replace(/^\./, "")
    .replace(/\.$/, "");
};

const deriveAreaCodes = (adminCode?: string | null) => {
  if (!adminCode) {
    return {
      provinceCode: null,
      cityCode: null,
      districtCode: null,
      villageCode: null
    };
  }

  const segments = adminCode.split(".");

  return {
    provinceCode: segments[0] ?? null,
    cityCode: segments.length >= 2 ? `${segments[0]}.${segments[1]}` : null,
    districtCode: segments.length >= 3 ? `${segments[0]}.${segments[1]}.${segments[2]}` : null,
    villageCode:
      segments.length >= 4
        ? `${segments[0]}.${segments[1]}.${segments[2]}.${segments.slice(3).join(".")}`
        : null
  };
};

const deriveParentCode = (level: AreaLevel, codes: {
  provinceCode?: string | null;
  cityCode?: string | null;
  districtCode?: string | null;
}) => {
  switch (level) {
    case AreaLevel.VILLAGE:
      return codes.districtCode ?? null;
    case AreaLevel.DISTRICT:
      return codes.cityCode ?? null;
    case AreaLevel.CITY:
      return codes.provinceCode ?? null;
    default:
      return null;
  }
};

const ensureLatitude = (value?: number | null) => {
  if (value === null || value === undefined) {
    return null;
  }

  if (value < -90 || value > 90) {
    throw new AppError("Latitude must be between -90 and 90", 400);
  }

  return value;
};

const ensureLongitude = (value?: number | null) => {
  if (value === null || value === undefined) {
    return null;
  }

  if (value < -180 || value > 180) {
    throw new AppError("Longitude must be between -180 and 180", 400);
  }

  return value;
};

const haversineDistanceKm = (
  firstLatitude: number,
  firstLongitude: number,
  secondLatitude: number,
  secondLongitude: number
) => {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const latitudeDelta = toRadians(secondLatitude - firstLatitude);
  const longitudeDelta = toRadians(secondLongitude - firstLongitude);
  const a =
    Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
    Math.cos(toRadians(firstLatitude)) *
      Math.cos(toRadians(secondLatitude)) *
      Math.sin(longitudeDelta / 2) *
      Math.sin(longitudeDelta / 2);

  return earthRadiusKm * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

const levelPriority = (level: AreaLevel) => {
  switch (level) {
    case AreaLevel.VILLAGE:
      return 0;
    case AreaLevel.DISTRICT:
      return 1;
    case AreaLevel.CITY:
      return 2;
    case AreaLevel.PROVINCE:
      return 3;
    default:
      return 4;
  }
};

const areaOptionSelect = {
  id: true,
  label: true,
  value: true,
  adminCode: true,
  description: true,
  level: true,
  parentId: true,
  provinceCode: true,
  cityCode: true,
  districtCode: true,
  villageCode: true,
  latitude: true,
  longitude: true,
  source: true
} satisfies Prisma.AreaDirectorySelect;

type SelectedArea = Prisma.AreaDirectoryGetPayload<{ select: typeof areaOptionSelect }>;

type DbClient = typeof prisma;

const buildScheduledAt = (departureTime: string | undefined, offsetMinutes: number) => {
  const base = departureTime ? new Date(departureTime) : new Date();
  const next = new Date(base);
  next.setMinutes(next.getMinutes() + offsetMinutes);
  return next.toISOString();
};

const buildDefaultRouteCheckpoints = (
  startArea: string,
  destinationArea: string,
  departureTime?: string
): RouteCheckpointRecommendation[] => {
  const normalizedStart = startArea.trim();
  const normalizedDestination = destinationArea.trim();
  const fallbackMidpoint = normalizedStart === normalizedDestination ? "Titik regroup aman" : "Checkpoint transit";

  return [
    {
      id: `cp-${normalizedStart.toLowerCase().replace(/\s+/g, "-")}`,
      title: "Titik kumpul awal",
      subtitle: "Briefing dan mulai barengan",
      area: normalizedStart,
      scheduledAt: buildScheduledAt(departureTime, 0),
      sourceType: TripCheckpointSourceType.DEFAULT,
      checkpointType: TripCheckpointType.DEPARTURE
    },
    {
      id: `cp-mid-${normalizedStart.toLowerCase().replace(/\s+/g, "-")}-${normalizedDestination.toLowerCase().replace(/\s+/g, "-")}`,
      title: fallbackMidpoint,
      subtitle: "Checkpoint default untuk cek kondisi tim",
      area: fallbackMidpoint,
      scheduledAt: buildScheduledAt(departureTime, 45),
      sourceType: TripCheckpointSourceType.DEFAULT,
      checkpointType: TripCheckpointType.PICKUP
    },
    {
      id: `cp-destination-${normalizedDestination.toLowerCase().replace(/\s+/g, "-")}`,
      title: "Titik tujuan akhir",
      subtitle: "Selesai trip dan konfirmasi kedatangan",
      area: normalizedDestination,
      scheduledAt: buildScheduledAt(departureTime, 120),
      sourceType: TripCheckpointSourceType.DEFAULT,
      checkpointType: TripCheckpointType.DESTINATION
    }
  ];
};

const toAreaOption = (area: SelectedArea): AreaOption => ({
  id: area.id,
  label: area.label,
  value: area.value,
  adminCode: area.adminCode,
  description: area.description,
  level: area.level,
  parentId: area.parentId,
  provinceCode: area.provinceCode,
  cityCode: area.cityCode,
  districtCode: area.districtCode,
  villageCode: area.villageCode,
  latitude: area.latitude,
  longitude: area.longitude,
  source: area.source
});

const toMeetPoint = (meetPoint: {
  id: string;
  name: string;
  type: string;
  address: string;
  areaId: string | null;
  areaLabel: string;
  latitude: number | null;
  longitude: number | null;
  source: DirectoryEntrySource;
}): MeetPoint => ({
  id: meetPoint.id,
  name: meetPoint.name,
  type: meetPoint.type,
  address: meetPoint.address,
  latitude: meetPoint.latitude,
  longitude: meetPoint.longitude,
  areaId: meetPoint.areaId,
  area: meetPoint.areaLabel,
  source: meetPoint.source
});

const toAreaLocationSuggestion = (
  area: SelectedArea,
  distanceKm: number | null,
  matchedBy: "AREA_DIRECTORY" | "MEET_POINT"
): AreaLocationSuggestion => ({
  ...toAreaOption(area),
  distanceKm,
  matchedBy
});

const sortAreasForPicker = (areas: SelectedArea[]) =>
  [...areas].sort((left, right) => {
    const levelDelta = levelPriority(left.level) - levelPriority(right.level);
    if (levelDelta !== 0) {
      return levelDelta;
    }

    if (left.source !== right.source) {
      return left.source.localeCompare(right.source);
    }

    return left.label.localeCompare(right.label, "id");
  });

export class MeetPointsService {
  constructor(private readonly db: DbClient = prisma) {}

  private async findParentId(level: AreaLevel, codes: {
    provinceCode?: string | null;
    cityCode?: string | null;
    districtCode?: string | null;
  }) {
    const parentCode = deriveParentCode(level, codes);
    if (!parentCode) {
      return null;
    }

    const parent = await this.db.areaDirectory.findFirst({
      where: {
        OR: [
          { adminCode: parentCode },
          { provinceCode: parentCode },
          { cityCode: parentCode },
          { districtCode: parentCode }
        ]
      },
      select: { id: true }
    });

    return parent?.id ?? null;
  }

  private async findExistingAreaForCreate(input: {
    normalizedLabel: string;
    level: AreaLevel;
    adminCode: string | null;
    latitude: number | null;
    longitude: number | null;
    provinceCode: string | null;
    cityCode: string | null;
    districtCode: string | null;
    villageCode: string | null;
  }) {
    if (input.adminCode) {
      const byAdminCode = await this.db.areaDirectory.findUnique({
        where: { adminCode: input.adminCode },
        select: areaOptionSelect
      });

      if (byAdminCode) {
        return byAdminCode;
      }
    }

    const sameLabelAreas = await this.db.areaDirectory.findMany({
      where: {
        normalizedLabel: input.normalizedLabel,
        isActive: true,
        ...(input.level ? { level: input.level } : undefined)
      },
      select: areaOptionSelect,
      take: 20
    });

    const exactHierarchyMatch = sameLabelAreas.find(
      (area) =>
        area.provinceCode === input.provinceCode &&
        area.cityCode === input.cityCode &&
        area.districtCode === input.districtCode &&
        area.villageCode === input.villageCode
    );

    if (exactHierarchyMatch) {
      return exactHierarchyMatch;
    }

    if (input.latitude !== null && input.longitude !== null) {
      const candidateLatitude = input.latitude;
      const candidateLongitude = input.longitude;
      const nearbyMatch = sameLabelAreas.find((area) => {
        if (area.latitude === null || area.longitude === null) {
          return false;
        }

        return (
          haversineDistanceKm(candidateLatitude, candidateLongitude, area.latitude, area.longitude) <=
          DEFAULT_NEARBY_DUPLICATE_RADIUS_KM
        );
      });

      if (nearbyMatch) {
        return nearbyMatch;
      }
    }

    if (sameLabelAreas.length === 1 && input.level === AreaLevel.OTHER) {
      return sameLabelAreas[0];
    }

    return null;
  }

  async getAll() {
    const points = await this.db.savedMeetPoint.findMany({
      orderBy: [{ source: "asc" }, { updatedAt: "desc" }]
    });

    return points.map(toMeetPoint);
  }

  async getAreaOptions(search?: string) {
    const normalizedSearch = search?.trim();

    const areas = await this.db.areaDirectory.findMany({
      select: areaOptionSelect,
      where: {
        isActive: true,
        ...(normalizedSearch
          ? {
              OR: [
                {
                  label: {
                    contains: normalizedSearch,
                    mode: "insensitive"
                  }
                },
                {
                  normalizedLabel: {
                    contains: normalizeLabel(normalizedSearch),
                    mode: "insensitive"
                  }
                },
                {
                  description: {
                    contains: normalizedSearch,
                    mode: "insensitive"
                  }
                },
                {
                  adminCode: {
                    contains: normalizedSearch,
                    mode: "insensitive"
                  }
                }
              ]
            }
          : undefined)
      },
      orderBy: [{ label: "asc" }],
      take: MAX_AREA_OPTIONS_LIMIT
    });

    return sortAreasForPicker(areas)
      .slice(0, DEFAULT_AREA_OPTIONS_LIMIT)
      .map(toAreaOption);
  }

  async createArea(payload: CreateAreaInput) {
    const label = payload.label.trim();
    const normalizedLabel = normalizeLabel(label);
    const adminCode = normalizeAdminCode(payload.adminCode);
    const latitude = ensureLatitude(payload.latitude);
    const longitude = ensureLongitude(payload.longitude);
    const derivedCodes = deriveAreaCodes(adminCode);
    const level = payload.level ?? (payload.villageCode || derivedCodes.villageCode ? AreaLevel.VILLAGE : AreaLevel.OTHER);
    const provinceCode = normalizeAdminCode(payload.provinceCode) ?? derivedCodes.provinceCode;
    const cityCode = normalizeAdminCode(payload.cityCode) ?? derivedCodes.cityCode;
    const districtCode = normalizeAdminCode(payload.districtCode) ?? derivedCodes.districtCode;
    const villageCode = normalizeAdminCode(payload.villageCode) ?? derivedCodes.villageCode;
    const source = payload.source ?? DirectoryEntrySource.USER_INPUT;

    const existingArea = await this.findExistingAreaForCreate({
      normalizedLabel,
      level,
      adminCode,
      latitude,
      longitude,
      provinceCode,
      cityCode,
      districtCode,
      villageCode
    });

    if (existingArea) {
      return toAreaOption(existingArea);
    }

    const parentId = await this.findParentId(level, {
      provinceCode,
      cityCode,
      districtCode
    });

    const createdArea = await this.db.areaDirectory.create({
      select: areaOptionSelect,
      data: {
        label,
        value: label,
        normalizedLabel,
        adminCode,
        level,
        parentId,
        provinceCode,
        cityCode,
        districtCode,
        villageCode,
        description: payload.description?.trim() || "Ditambahkan dari aplikasi mobile",
        latitude,
        longitude,
        source
      }
    });

    return toAreaOption(createdArea);
  }

  async getRecommendations(area?: string) {
    const normalizedArea = area?.trim();
    const points = await this.db.savedMeetPoint.findMany({
      where: normalizedArea
        ? {
            OR: [
              {
                areaLabel: {
                  contains: normalizedArea,
                  mode: "insensitive"
                }
              },
              {
                name: {
                  contains: normalizedArea,
                  mode: "insensitive"
                }
              },
              {
                address: {
                  contains: normalizedArea,
                  mode: "insensitive"
                }
              }
            ]
          }
        : undefined,
      orderBy: [{ source: "asc" }, { updatedAt: "desc" }],
      take: 20
    });

    return points.map(toMeetPoint);
  }

  async createMeetPoint(payload: CreateMeetPointInput) {
    const areaLabel = payload.area.trim();
    const normalizedArea = normalizeLabel(areaLabel);
    let area = await this.db.areaDirectory.findFirst({
      where: { normalizedLabel: normalizedArea },
      select: areaOptionSelect
    });

    if (!area) {
      area = await this.db.areaDirectory.create({
        select: areaOptionSelect,
        data: {
          label: areaLabel,
          value: areaLabel,
          normalizedLabel: normalizedArea,
          level: AreaLevel.OTHER,
          description: "Ditambahkan dari input titik point",
          source: DirectoryEntrySource.USER_INPUT
        }
      });
    }

    const createdPoint = await this.db.savedMeetPoint.create({
      data: {
        name: payload.name.trim(),
        type: payload.type?.trim() || "Custom Point",
        address: payload.address.trim(),
        areaId: area.id,
        areaLabel,
        normalizedArea,
        latitude: ensureLatitude(payload.latitude) ?? null,
        longitude: ensureLongitude(payload.longitude) ?? null,
        source: DirectoryEntrySource.USER_INPUT
      }
    });

    return toMeetPoint(createdPoint);
  }

  async getTripLeaderRouteRecommendations(input: {
    startArea: string;
    destinationArea: string;
    departureTime?: string;
  }): Promise<TripLeaderRouteRecommendationsResponse> {
    const [availableAreas, knownStartArea, knownDestinationArea] = await Promise.all([
      this.getAreaOptions(),
      this.db.areaDirectory.findFirst({
        select: { id: true },
        where: {
          label: {
            equals: input.startArea.trim(),
            mode: "insensitive"
          }
        }
      }),
      this.db.areaDirectory.findFirst({
        select: { id: true },
        where: {
          label: {
            equals: input.destinationArea.trim(),
            mode: "insensitive"
          }
        }
      })
    ]);

    if (!knownStartArea) {
      await this.createArea({ label: input.startArea });
    }

    if (!knownDestinationArea) {
      await this.createArea({ label: input.destinationArea });
    }

    return {
      availableAreas,
      checkpoints: buildDefaultRouteCheckpoints(
        input.startArea,
        input.destinationArea,
        input.departureTime
      )
    };
  }

  async suggestAreaFromLocation(input: {
    latitude: number;
    longitude: number;
    limit?: number;
  }): Promise<SuggestAreaFromLocationResponse> {
    const latitude = ensureLatitude(input.latitude);
    const longitude = ensureLongitude(input.longitude);

    if (latitude === null || longitude === null) {
      throw new AppError("Latitude and longitude are required", 400);
    }

    const limit = Math.min(Math.max(input.limit ?? DEFAULT_SUGGESTIONS_LIMIT, 1), MAX_SUGGESTIONS_LIMIT);
    const safeLatitude = latitude;
    const safeLongitude = longitude;

    const nearestAreas = await this.db.$queryRaw<
      Array<SelectedArea & { distanceKm: number }>
    >(Prisma.sql`
      SELECT
        id,
        label,
        value,
        "adminCode",
        description,
        level,
        "parentId",
        "provinceCode",
        "cityCode",
        "districtCode",
        "villageCode",
        latitude,
        longitude,
        source,
        (
          6371 * acos(
            LEAST(
              1,
              GREATEST(
                -1,
                cos(radians(${safeLatitude})) * cos(radians(latitude)) * cos(radians(longitude) - radians(${safeLongitude})) +
                sin(radians(${safeLatitude})) * sin(radians(latitude))
              )
            )
          )
        ) AS "distanceKm"
      FROM "AreaDirectory"
      WHERE "isActive" = true
        AND latitude IS NOT NULL
        AND longitude IS NOT NULL
      ORDER BY "distanceKm" ASC
      LIMIT ${Prisma.raw(String(Math.max(limit * 5, 20)))}
    `);

    const closeAreaSuggestions = nearestAreas
      .filter((area) => area.distanceKm <= DEFAULT_LOCATION_MATCH_RADIUS_KM)
      .sort((left, right) => {
        const levelDelta = levelPriority(left.level) - levelPriority(right.level);
        if (levelDelta !== 0) {
          return levelDelta;
        }

        return left.distanceKm - right.distanceKm;
      })
      .slice(0, limit)
      .map((area) =>
        toAreaLocationSuggestion(area, Number(area.distanceKm.toFixed(2)), "AREA_DIRECTORY")
      );

    if (closeAreaSuggestions.length > 0) {
      return {
        primary: closeAreaSuggestions[0] ?? null,
        suggestions: closeAreaSuggestions
      };
    }

    const nearestMeetPoints = await this.db.$queryRaw<
      Array<{
        id: string;
        areaId: string | null;
        areaLabel: string;
        source: DirectoryEntrySource;
        distanceKm: number;
      }>
    >(Prisma.sql`
      SELECT
        id,
        "areaId",
        "areaLabel",
        source,
        (
          6371 * acos(
            LEAST(
              1,
              GREATEST(
                -1,
                cos(radians(${safeLatitude})) * cos(radians(latitude)) * cos(radians(longitude) - radians(${safeLongitude})) +
                sin(radians(${safeLatitude})) * sin(radians(latitude))
              )
            )
          )
        ) AS "distanceKm"
      FROM "SavedMeetPoint"
      WHERE latitude IS NOT NULL
        AND longitude IS NOT NULL
      ORDER BY "distanceKm" ASC
      LIMIT ${Prisma.raw(String(Math.max(limit * 3, 10)))}
    `);

    const closeMeetPoints = nearestMeetPoints
      .filter((point) => point.distanceKm <= DEFAULT_LOCATION_MATCH_RADIUS_KM)
      .slice(0, limit);

    if (closeMeetPoints.length === 0) {
      return {
        primary: null,
        suggestions: []
      };
    }

    const knownAreaIds = closeMeetPoints
      .map((point) => point.areaId)
      .filter((value): value is string => Boolean(value));

    const knownAreas = knownAreaIds.length
      ? await this.db.areaDirectory.findMany({
          select: areaOptionSelect,
          where: {
            id: {
              in: knownAreaIds
            }
          }
        })
      : [];

    const areaById = new Map(knownAreas.map((area) => [area.id, area]));

    const suggestions = closeMeetPoints.map((point) => {
      const mappedArea = point.areaId ? areaById.get(point.areaId) : null;

      if (mappedArea) {
        return toAreaLocationSuggestion(
          mappedArea,
          Number(point.distanceKm.toFixed(2)),
          "MEET_POINT"
        );
      }

      const fallbackArea: SelectedArea = {
        id: `meet-point-${point.id}`,
        label: point.areaLabel,
        value: point.areaLabel,
        adminCode: null,
        description: "Saran area dari titik point terdekat",
        level: AreaLevel.OTHER,
        parentId: null,
        provinceCode: null,
        cityCode: null,
        districtCode: null,
        villageCode: null,
        latitude: null,
        longitude: null,
        source: point.source
      };

      return toAreaLocationSuggestion(
        fallbackArea,
        Number(point.distanceKm.toFixed(2)),
        "MEET_POINT"
      );
    });

    return {
      primary: suggestions[0] ?? null,
      suggestions
    };
  }
}

export const meetPointsService = new MeetPointsService();

export const areaDirectoryTestUtils = {
  normalizeLabel,
  normalizeAdminCode,
  deriveAreaCodes,
  haversineDistanceKm
};
