import assert from "node:assert/strict";
import test from "node:test";
import { AreaLevel, DirectoryEntrySource } from "@prisma/client";
import { MeetPointsService } from "./meetPoints.service";

const createArea = (overrides: Partial<{
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
}> = {}) => ({
  id: overrides.id ?? "area-1",
  label: overrides.label ?? "Jatimulya, Tambun Selatan, Kabupaten Bekasi",
  adminCode: overrides.adminCode ?? "32.16.07.1001",
  description: overrides.description ?? "Kelurahan Jatimulya",
  level: overrides.level ?? AreaLevel.VILLAGE,
  parentId: overrides.parentId ?? "district-1",
  provinceCode: overrides.provinceCode ?? "32",
  cityCode: overrides.cityCode ?? "32.16",
  districtCode: overrides.districtCode ?? "32.16.07",
  villageCode: overrides.villageCode ?? "32.16.07.1001",
  latitude: overrides.latitude ?? -6.2642,
  longitude: overrides.longitude ?? 107.0562,
  source: overrides.source ?? DirectoryEntrySource.OFFICIAL_IMPORT
});

test("getAreaOptions returns village-first search results for the mobile picker", async () => {
  const areas = [
    createArea({
      id: "district-1",
      label: "Bekasi Timur, Kota Bekasi",
      adminCode: "32.75.03",
      description: "Kecamatan Bekasi Timur",
      level: AreaLevel.DISTRICT,
      villageCode: null
    }),
    createArea({
      id: "village-1",
      label: "Duren Jaya, Bekasi Timur, Kota Bekasi",
      adminCode: "32.75.03.1001",
      description: "Kelurahan Duren Jaya"
    })
  ];

  const fakeDb = {
    areaDirectory: {
      findMany: async () => areas
    }
  };

  const service = new MeetPointsService(fakeDb as never);
  const result = await service.getAreaOptions("Bekasi");

  assert.equal(result.length, 2);
  assert.equal(result[0].id, "village-1");
  assert.equal(result[0].value, result[0].label);
  assert.equal(result[1].id, "district-1");
});

test("createArea returns an existing record when adminCode already exists", async () => {
  const existingArea = createArea();
  let createCalled = false;

  const fakeDb = {
    areaDirectory: {
      findUnique: async ({ where }: { where: { adminCode?: string } }) =>
        where.adminCode === existingArea.adminCode ? existingArea : null,
      findMany: async () => [],
      findFirst: async () => null,
      create: async () => {
        createCalled = true;
        return existingArea;
      }
    }
  };

  const service = new MeetPointsService(fakeDb as never);
  const result = await service.createArea({
    label: existingArea.label,
    adminCode: existingArea.adminCode ?? undefined,
    source: "DEVICE_LOCATION"
  });

  assert.equal(result.id, existingArea.id);
  assert.equal(createCalled, false);
});

test("createArea deduplicates by normalized label plus nearby coordinates", async () => {
  const existingArea = createArea({
    id: "village-nearby",
    label: "Sukamaju",
    adminCode: null,
    description: "Kelurahan Sukamaju",
    provinceCode: null,
    cityCode: null,
    districtCode: null,
    villageCode: null,
    latitude: -6.2,
    longitude: 106.8
  });
  let createCalled = false;

  const fakeDb = {
    areaDirectory: {
      findUnique: async () => null,
      findMany: async () => [existingArea],
      findFirst: async () => null,
      create: async () => {
        createCalled = true;
        return existingArea;
      }
    }
  };

  const service = new MeetPointsService(fakeDb as never);
  const result = await service.createArea({
    label: "  Sukamaju ",
    latitude: -6.2005,
    longitude: 106.8004,
    source: "DEVICE_LOCATION"
  });

  assert.equal(result.id, existingArea.id);
  assert.equal(createCalled, false);
});

test("suggestAreaFromLocation prefers a nearby village suggestion over broader levels", async () => {
  const district = createArea({
    id: "district-1",
    label: "Bekasi Timur, Kota Bekasi",
    adminCode: "32.75.03",
    description: "Kecamatan Bekasi Timur",
    level: AreaLevel.DISTRICT,
    villageCode: null,
    latitude: -6.235,
    longitude: 106.984,
    source: DirectoryEntrySource.OFFICIAL_IMPORT
  });
  const village = createArea({
    id: "village-1",
    label: "Duren Jaya, Bekasi Timur, Kota Bekasi",
    adminCode: "32.75.03.1001",
    description: "Kelurahan Duren Jaya",
    level: AreaLevel.VILLAGE,
    latitude: -6.2388,
    longitude: 106.9831,
    source: DirectoryEntrySource.OFFICIAL_IMPORT
  });

  const fakeDb = {
    $queryRaw: async () => [
      { ...district, distanceKm: 0.7 },
      { ...village, distanceKm: 1.2 }
    ],
    areaDirectory: {
      findMany: async () => []
    }
  };

  const service = new MeetPointsService(fakeDb as never);
  const result = await service.suggestAreaFromLocation({
    latitude: -6.237,
    longitude: 106.983,
    limit: 5
  });

  assert.ok(result.primary);
  assert.equal(result.primary?.id, "village-1");
  assert.equal(result.primary?.matchedBy, "AREA_DIRECTORY");
  assert.equal(result.suggestions[0]?.level, AreaLevel.VILLAGE);
});
