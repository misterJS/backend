import { TripCheckpointSourceType, TripCheckpointType } from "@prisma/client";
import {
  MeetPoint,
  RouteCheckpointRecommendation,
  TripLeaderRouteRecommendationsResponse
} from "./meetPoints.types";

const INDONESIA_AREA_OPTIONS = [
  "Banda Aceh",
  "Medan",
  "Padang",
  "Pekanbaru",
  "Tanjung Pinang",
  "Jambi",
  "Palembang",
  "Pangkal Pinang",
  "Bandar Lampung",
  "Serang",
  "Jakarta",
  "Bandung",
  "Bekasi Timur",
  "Bekasi Barat",
  "Bogor",
  "Depok",
  "Cirebon",
  "Semarang",
  "Solo",
  "Yogyakarta",
  "Surabaya",
  "Malang",
  "Kediri",
  "Denpasar",
  "Mataram",
  "Kupang",
  "Pontianak",
  "Palangkaraya",
  "Banjarmasin",
  "Samarinda",
  "Balikpapan",
  "Nusantara",
  "Manado",
  "Palu",
  "Makassar",
  "Kendari",
  "Gorontalo",
  "Mamuju",
  "Ambon",
  "Sofifi",
  "Ternate",
  "Jayapura",
  "Sorong",
  "Manokwari",
  "Nabire",
  "Cikarang",
  "Cibitung",
  "Tambun"
] as const;

const MEET_POINTS: MeetPoint[] = [
  {
    id: "mp-1",
    name: "Indomaret Bekasi Timur",
    type: "Indomaret",
    address: "Jl. HM Joyomartono, Bekasi Timur",
    latitude: -6.2341,
    longitude: 107.0304,
    area: "Bekasi Timur"
  },
  {
    id: "mp-2",
    name: "Alfamart Tambun Raya",
    type: "Alfamart",
    address: "Jl. Sultan Hasanudin, Tambun",
    latitude: -6.2642,
    longitude: 107.0562,
    area: "Tambun"
  },
  {
    id: "mp-3",
    name: "SPBU Cikarang Utama",
    type: "SPBU",
    address: "Jl. Jababeka Raya, Cikarang",
    latitude: -6.3011,
    longitude: 107.1523,
    area: "Cikarang"
  },
  {
    id: "mp-4",
    name: "Pos Satpam Cibitung Central",
    type: "Pos Satpam",
    address: "Jl. Teuku Umar, Cibitung",
    latitude: -6.2514,
    longitude: 107.0928,
    area: "Cibitung"
  },
  {
    id: "mp-5",
    name: "Gerbang Perumahan Bekasi Barat",
    type: "Gerbang Perumahan",
    address: "Jl. KH Noer Ali, Bekasi Barat",
    latitude: -6.2388,
    longitude: 106.9831,
    area: "Bekasi Barat"
  }
];

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

  const routeAreas = Array.from(
    new Set([
      normalizedStart,
      ...MEET_POINTS.filter(
        (point) =>
          point.area.toLowerCase().includes(normalizedStart.toLowerCase()) ||
          point.area.toLowerCase().includes(normalizedDestination.toLowerCase())
      ).map((point) => point.area),
      normalizedDestination
    ])
  );

  const fallbackMidpoints = routeAreas.length > 2 ? routeAreas.slice(1, -1) : ["Checkpoint Aman"];

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
    ...fallbackMidpoints.slice(0, 2).map((area, index) => ({
      id: `cp-mid-${index + 1}-${area.toLowerCase().replace(/\s+/g, "-")}`,
      title: index === 0 ? "Checkpoint transit" : "Checkpoint istirahat",
      subtitle: index === 0 ? "Pickup atau regroup singkat" : "Rest dan cek kondisi tim",
      area,
      scheduledAt: buildScheduledAt(departureTime, (index + 1) * 45),
      sourceType: TripCheckpointSourceType.DEFAULT,
      checkpointType: index === 0 ? TripCheckpointType.PICKUP : TripCheckpointType.REST
    })),
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

export class MeetPointsService {
  getAll() {
    return MEET_POINTS;
  }

  getAreaOptions(search?: string) {
    if (!search) {
      return Array.from(INDONESIA_AREA_OPTIONS);
    }

    const normalized = search.trim().toLowerCase();
    return INDONESIA_AREA_OPTIONS.filter((area) => area.toLowerCase().includes(normalized));
  }

  getRecommendations(area?: string) {
    if (!area) {
      return MEET_POINTS;
    }

    const normalized = area.trim().toLowerCase();
    return MEET_POINTS.filter((point) => point.area.toLowerCase().includes(normalized));
  }

  getTripLeaderRouteRecommendations(input: {
    startArea: string;
    destinationArea: string;
    departureTime?: string;
  }): TripLeaderRouteRecommendationsResponse {
    return {
      availableAreas: this.getAreaOptions(),
      checkpoints: buildDefaultRouteCheckpoints(
        input.startArea,
        input.destinationArea,
        input.departureTime
      )
    };
  }
}

export const meetPointsService = new MeetPointsService();
