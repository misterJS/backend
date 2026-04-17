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
  AreaOption,
  CreateAreaInput,
  CreateMeetPointInput,
  MeetPoint,
  RouteCheckpointRecommendation,
  SuggestAreaFromLocationResponse,
  TripLeaderRouteRecommendationsResponse
} from "./meetPoints.types";

const normalizeLabel = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");
const areaOptionSelect = {
  id: true,
  label: true,
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

const toAreaOption = (area: {
  id: string;
  label: string;
  adminCode: string | null;
  description: string | null;
  level: AreaLevel;
  parentId: string | null;
  provinceCode: string | null;
  cityCode: string | null;
  districtCode: string | null;
  villageCode: string | null;
  latitude: number | null;
  longitude: number | null;
  source: DirectoryEntrySource;
}): AreaOption => ({
  id: area.id,
  label: area.label,
  value: area.label,
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
  area: Parameters<typeof toAreaOption>[0],
  distanceKm: number | null,
  matchedBy: "AREA_DIRECTORY" | "MEET_POINT"
) => ({
  ...toAreaOption(area),
  distanceKm,
  matchedBy
});

export class MeetPointsService {
  async getAll() {
    const points = await prisma.savedMeetPoint.findMany({
      orderBy: [{ source: "asc" }, { updatedAt: "desc" }]
    });

    return points.map(toMeetPoint);
  }

  async getAreaOptions(search?: string) {
    const normalizedSearch = search?.trim();

    const areas = await prisma.areaDirectory.findMany({
      select: areaOptionSelect,
      where: normalizedSearch
        ? {
            OR: [
              {
                label: {
                  contains: normalizedSearch,
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
        : undefined,
      orderBy: [{ source: "asc" }, { label: "asc" }],
      take: 30
    });

    return areas.map(toAreaOption);
  }

  async createArea(payload: CreateAreaInput) {
    const label = payload.label.trim();
    const normalizedLabel = normalizeLabel(label);

    const existingArea = await prisma.areaDirectory.findUnique({
      where: { normalizedLabel },
      select: areaOptionSelect
    });

    if (existingArea) {
      return toAreaOption(existingArea);
    }

    const createdArea = await prisma.areaDirectory.create({
      select: areaOptionSelect,
      data: {
        label,
        normalizedLabel,
        level: AreaLevel.OTHER,
        description: "Input manual pengguna",
        source: DirectoryEntrySource.USER_INPUT
      }
    });

    return toAreaOption(createdArea);
  }

  async getRecommendations(area?: string) {
    const normalizedArea = area?.trim();
    const points = await prisma.savedMeetPoint.findMany({
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
    let area = await prisma.areaDirectory.findUnique({
      where: { normalizedLabel: normalizedArea },
      select: areaOptionSelect
    });

    if (!area) {
      area = await prisma.areaDirectory.create({
        select: areaOptionSelect,
        data: {
          label: areaLabel,
          normalizedLabel: normalizedArea,
          level: AreaLevel.OTHER,
          description: "Ditambahkan dari input titik point",
          source: DirectoryEntrySource.USER_INPUT
        }
      });
    }

    const createdPoint = await prisma.savedMeetPoint.create({
      data: {
        name: payload.name.trim(),
        type: payload.type?.trim() || "Custom Point",
        address: payload.address.trim(),
        areaId: area.id,
        areaLabel,
        normalizedArea,
        latitude: payload.latitude ?? null,
        longitude: payload.longitude ?? null,
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
      prisma.areaDirectory.findFirst({
        select: { id: true },
        where: {
          label: {
            equals: input.startArea.trim(),
            mode: "insensitive"
          }
        }
      }),
      prisma.areaDirectory.findFirst({
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
    const latitude = input.latitude;
    const longitude = input.longitude;
    const limit = Math.min(Math.max(input.limit ?? 5, 1), 10);

    const nearestAreas = await prisma.$queryRaw<
      Array<{
        id: string;
        label: string;
        adminCode: string | null;
        description: string | null;
        level: AreaLevel;
        parentId: string | null;
        provinceCode: string | null;
        cityCode: string | null;
        districtCode: string | null;
        villageCode: string | null;
        latitude: number | null;
        longitude: number | null;
        source: DirectoryEntrySource;
        distanceKm: number;
      }>
    >(Prisma.sql`
      SELECT
        id,
        label,
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
                cos(radians(${latitude})) * cos(radians(latitude)) * cos(radians(longitude) - radians(${longitude})) +
                sin(radians(${latitude})) * sin(radians(latitude))
              )
            )
          )
        ) AS "distanceKm"
      FROM "AreaDirectory"
      WHERE "isActive" = true
        AND latitude IS NOT NULL
        AND longitude IS NOT NULL
      ORDER BY
        CASE level
          WHEN 'VILLAGE' THEN 0
          WHEN 'DISTRICT' THEN 1
          WHEN 'CITY' THEN 2
          WHEN 'PROVINCE' THEN 3
          ELSE 4
        END ASC,
        "distanceKm" ASC
      LIMIT ${Prisma.raw(String(limit))}
    `);

    if (nearestAreas.length > 0) {
      const suggestions = nearestAreas.map((area) =>
        toAreaLocationSuggestion(area, Number(area.distanceKm.toFixed(2)), "AREA_DIRECTORY")
      );

      return {
        primary: suggestions[0] ?? null,
        suggestions
      };
    }

    const nearestMeetPoints = await prisma.$queryRaw<
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
                cos(radians(${latitude})) * cos(radians(latitude)) * cos(radians(longitude) - radians(${longitude})) +
                sin(radians(${latitude})) * sin(radians(latitude))
              )
            )
          )
        ) AS "distanceKm"
      FROM "SavedMeetPoint"
      WHERE latitude IS NOT NULL
        AND longitude IS NOT NULL
      ORDER BY "distanceKm" ASC
      LIMIT ${Prisma.raw(String(limit))}
    `);

    if (nearestMeetPoints.length === 0) {
      return {
        primary: null,
        suggestions: []
      };
    }

    const knownAreaIds = nearestMeetPoints
      .map((point) => point.areaId)
      .filter((value): value is string => Boolean(value));

    const knownAreas = knownAreaIds.length
      ? await prisma.areaDirectory.findMany({
          select: areaOptionSelect,
          where: {
            id: {
              in: knownAreaIds
            }
          }
        })
      : [];

    const areaById = new Map(knownAreas.map((area) => [area.id, area]));

    const suggestions = nearestMeetPoints.map((point) => {
      const mappedArea = point.areaId ? areaById.get(point.areaId) : null;

      if (mappedArea) {
        return toAreaLocationSuggestion(
          mappedArea,
          Number(point.distanceKm.toFixed(2)),
          "MEET_POINT"
        );
      }

      return {
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
        source: point.source,
        distanceKm: Number(point.distanceKm.toFixed(2)),
        matchedBy: "MEET_POINT" as const
      };
    });

    return {
      primary: suggestions[0] ?? null,
      suggestions
    };
  }
}

export const meetPointsService = new MeetPointsService();
