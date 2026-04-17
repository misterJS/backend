import fs from "fs/promises";
import path from "path";
import { AreaLevel, DirectoryEntrySource } from "@prisma/client";
import "../src/config/env";
import { prisma } from "../src/prisma/client";

type RawRecord = Record<string, string | number | boolean | null | undefined>;

type ParsedAreaRecord = {
  label: string;
  normalizedLabel: string;
  adminCode: string | null;
  level: AreaLevel;
  parentCode: string | null;
  provinceCode: string | null;
  cityCode: string | null;
  districtCode: string | null;
  villageCode: string | null;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  countryCode: string;
  isActive: boolean;
  source: DirectoryEntrySource;
};

const normalizeLabel = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

const usage = () => {
  // eslint-disable-next-line no-console
  console.log(`
Usage:
  npm run areas:import -- --file ./data/areas.csv
  npm run areas:import -- --file ./data/areas.geojson --format geojson --dry-run

Supported CSV columns:
  adminCode,label,level,parentCode,description,latitude,longitude,countryCode,isActive

Supported GeoJSON properties:
  adminCode|admin_code|kode|kode_wilayah
  label|name|nama
  level|areaLevel|tingkat
  parentCode|parent_code|kode_parent
  description|deskripsi
  latitude|lat
  longitude|lon|lng
`);
};

const getArgValue = (name: string) => {
  const index = process.argv.findIndex((arg) => arg === name);
  if (index === -1 || index === process.argv.length - 1) {
    return null;
  }

  return process.argv[index + 1] ?? null;
};

const hasFlag = (name: string) => process.argv.includes(name);

const toStringValue = (value: RawRecord[keyof RawRecord]) => {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
};

const toNumberValue = (value: RawRecord[keyof RawRecord]) => {
  const text = toStringValue(value);
  if (!text) {
    return null;
  }

  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
};

const toBooleanValue = (value: RawRecord[keyof RawRecord], fallback = true) => {
  const text = toStringValue(value);
  if (!text) {
    return fallback;
  }

  return ["1", "true", "yes", "y"].includes(text.toLowerCase());
};

const getFirstValue = (record: RawRecord, keys: string[]) => {
  for (const key of keys) {
    if (key in record) {
      return record[key];
    }
  }

  return undefined;
};

const normalizeAdminCode = (value: string | null) => {
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

const mapAreaLevel = (value: string | null) => {
  const normalized = value?.trim().toLowerCase();

  switch (normalized) {
    case "province":
    case "provinsi":
      return AreaLevel.PROVINCE;
    case "city":
    case "kabupaten":
    case "kota":
    case "city_regency":
      return AreaLevel.CITY;
    case "district":
    case "kecamatan":
      return AreaLevel.DISTRICT;
    case "village":
    case "desa":
    case "kelurahan":
      return AreaLevel.VILLAGE;
    default:
      return AreaLevel.OTHER;
  }
};

const deriveParentCode = (adminCode: string | null) => {
  if (!adminCode) {
    return null;
  }

  const segments = adminCode.split(".");
  return segments.length > 1 ? segments.slice(0, -1).join(".") : null;
};

const deriveAreaCodes = (adminCode: string | null) => {
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

const extractCoordinates = (geometry: unknown): { latitude: number | null; longitude: number | null } => {
  if (!geometry || typeof geometry !== "object") {
    return { latitude: null, longitude: null };
  }

  const maybeGeometry = geometry as { type?: string; coordinates?: unknown };

  const collectPairs = (value: unknown, acc: Array<[number, number]>) => {
    if (!Array.isArray(value)) {
      return;
    }

    if (
      value.length >= 2 &&
      typeof value[0] === "number" &&
      typeof value[1] === "number"
    ) {
      acc.push([value[0], value[1]]);
      return;
    }

    value.forEach((item) => collectPairs(item, acc));
  };

  const pairs: Array<[number, number]> = [];
  collectPairs(maybeGeometry.coordinates, pairs);

  if (pairs.length === 0) {
    return { latitude: null, longitude: null };
  }

  if (maybeGeometry.type === "Point") {
    return {
      longitude: pairs[0][0],
      latitude: pairs[0][1]
    };
  }

  const longitudes = pairs.map((pair) => pair[0]);
  const latitudes = pairs.map((pair) => pair[1]);

  return {
    longitude: (Math.min(...longitudes) + Math.max(...longitudes)) / 2,
    latitude: (Math.min(...latitudes) + Math.max(...latitudes)) / 2
  };
};

const parseCsvLine = (line: string) => {
  const values: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === "\"") {
      if (insideQuotes && nextChar === "\"") {
        current += "\"";
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (char === "," && !insideQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values.map((value) => value.trim());
};

const parseCsv = (content: string): RawRecord[] => {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return [];
  }

  const headers = parseCsvLine(lines[0]);

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const record: RawRecord = {};

    headers.forEach((header, index) => {
      record[header] = values[index] ?? "";
    });

    return record;
  });
};

const parseGeoJson = (content: string): RawRecord[] => {
  const parsed = JSON.parse(content) as {
    type?: string;
    features?: Array<{ properties?: RawRecord; geometry?: unknown }>;
  };

  if (parsed.type !== "FeatureCollection" || !Array.isArray(parsed.features)) {
    throw new Error("GeoJSON harus berbentuk FeatureCollection.");
  }

  return parsed.features.map((feature) => {
    const properties = feature.properties ?? {};
    const geometryCoordinates = extractCoordinates(feature.geometry);

    return {
      ...properties,
      latitude:
        getFirstValue(properties, ["latitude", "lat"]) ?? geometryCoordinates.latitude ?? undefined,
      longitude:
        getFirstValue(properties, ["longitude", "lon", "lng"]) ??
        geometryCoordinates.longitude ??
        undefined
    };
  });
};

const toParsedAreaRecord = (record: RawRecord, source: DirectoryEntrySource): ParsedAreaRecord | null => {
  const label = toStringValue(getFirstValue(record, ["label", "name", "nama", "display_name"]));
  if (!label) {
    return null;
  }

  const adminCode = normalizeAdminCode(
    toStringValue(
      getFirstValue(record, [
        "adminCode",
        "admin_code",
        "kode",
        "kode_wilayah",
        "code",
        "code_id"
      ])
    )
  );
  const level = mapAreaLevel(
    toStringValue(getFirstValue(record, ["level", "areaLevel", "tingkat", "jenis"]))
  );
  const parentCode =
    normalizeAdminCode(
      toStringValue(getFirstValue(record, ["parentCode", "parent_code", "kode_parent"]))
    ) ?? deriveParentCode(adminCode);
  const derivedCodes = deriveAreaCodes(adminCode);

  return {
    label,
    normalizedLabel: normalizeLabel(label),
    adminCode,
    level,
    parentCode,
    provinceCode:
      normalizeAdminCode(
        toStringValue(getFirstValue(record, ["provinceCode", "province_code"]))
      ) ?? derivedCodes.provinceCode,
    cityCode:
      normalizeAdminCode(toStringValue(getFirstValue(record, ["cityCode", "city_code"]))) ??
      derivedCodes.cityCode,
    districtCode:
      normalizeAdminCode(
        toStringValue(getFirstValue(record, ["districtCode", "district_code"]))
      ) ?? derivedCodes.districtCode,
    villageCode:
      normalizeAdminCode(
        toStringValue(getFirstValue(record, ["villageCode", "village_code"]))
      ) ?? derivedCodes.villageCode,
    description: toStringValue(getFirstValue(record, ["description", "deskripsi"])),
    latitude: toNumberValue(getFirstValue(record, ["latitude", "lat"])),
    longitude: toNumberValue(getFirstValue(record, ["longitude", "lon", "lng"])),
    countryCode: toStringValue(getFirstValue(record, ["countryCode", "country_code"])) ?? "ID",
    isActive: toBooleanValue(getFirstValue(record, ["isActive", "is_active"]), true),
    source
  };
};

const readRecordsFromFile = async (filePath: string, formatOverride: string | null) => {
  const content = await fs.readFile(filePath, "utf8");
  const format = (formatOverride ?? path.extname(filePath).replace(".", "")).toLowerCase();

  if (format === "csv") {
    return parseCsv(content);
  }

  if (format === "geojson" || format === "json") {
    return parseGeoJson(content);
  }

  throw new Error(`Format file "${format}" belum didukung. Gunakan csv atau geojson.`);
};

const main = async () => {
  if (hasFlag("--help")) {
    usage();
    return;
  }

  const fileArg = getArgValue("--file");
  if (!fileArg) {
    usage();
    throw new Error("Parameter --file wajib diisi.");
  }

  const sourceArg = getArgValue("--source");
  const source =
    sourceArg && sourceArg in DirectoryEntrySource
      ? DirectoryEntrySource[sourceArg as keyof typeof DirectoryEntrySource]
      : DirectoryEntrySource.OFFICIAL_IMPORT;
  const dryRun = hasFlag("--dry-run");
  const resolvedPath = path.resolve(process.cwd(), fileArg);
  const rawRecords = await readRecordsFromFile(resolvedPath, getArgValue("--format"));
  const parsedRecords = rawRecords
    .map((record) => toParsedAreaRecord(record, source))
    .filter((record): record is ParsedAreaRecord => Boolean(record))
    .sort((left, right) => {
      const leftDepth = left.adminCode?.split(".").length ?? 99;
      const rightDepth = right.adminCode?.split(".").length ?? 99;
      return leftDepth - rightDepth;
    });

  const codeToId = new Map<string, string>();
  let createdCount = 0;
  let updatedCount = 0;

  if (dryRun) {
    // eslint-disable-next-line no-console
    console.log(`Dry run: ${parsedRecords.length} area siap diimport dari ${resolvedPath}`);
    return;
  }

  for (const record of parsedRecords) {
    const parentId = record.parentCode ? codeToId.get(record.parentCode) ?? null : null;
    const createData = {
      label: record.label,
      normalizedLabel: record.normalizedLabel,
      adminCode: record.adminCode,
      level: record.level,
      parentId,
      provinceCode: record.provinceCode,
      cityCode: record.cityCode,
      districtCode: record.districtCode,
      villageCode: record.villageCode,
      description: record.description,
      latitude: record.latitude,
      longitude: record.longitude,
      countryCode: record.countryCode,
      isActive: record.isActive,
      source: record.source
    };

    const existing = record.adminCode
      ? await prisma.areaDirectory.findUnique({
          where: { adminCode: record.adminCode },
          select: { id: true }
        })
      : await prisma.areaDirectory.findUnique({
          where: { normalizedLabel: record.normalizedLabel },
          select: { id: true }
        });

    const area = existing
      ? await prisma.areaDirectory.update({
          where: { id: existing.id },
          data: createData,
          select: { id: true, adminCode: true }
        })
      : await prisma.areaDirectory.create({
          data: createData,
          select: { id: true, adminCode: true }
        });

    if (existing) {
      updatedCount += 1;
    } else {
      createdCount += 1;
    }

    if (area.adminCode) {
      codeToId.set(area.adminCode, area.id);
    }
  }

  // eslint-disable-next-line no-console
  console.log(
    `Import selesai. created=${createdCount}, updated=${updatedCount}, total=${parsedRecords.length}`
  );
};

void main()
  .catch(async (error: unknown) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
