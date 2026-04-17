CREATE TYPE "DirectoryEntrySource" AS ENUM ('SEED', 'USER_INPUT');

CREATE TYPE "AreaLevel" AS ENUM ('PROVINCE', 'CITY', 'DISTRICT', 'VILLAGE', 'OTHER');

CREATE TABLE "AreaDirectory" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "normalizedLabel" TEXT NOT NULL,
    "level" "AreaLevel" NOT NULL DEFAULT 'OTHER',
    "description" TEXT,
    "source" "DirectoryEntrySource" NOT NULL DEFAULT 'SEED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AreaDirectory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SavedMeetPoint" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "areaLabel" TEXT NOT NULL,
    "normalizedArea" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "source" "DirectoryEntrySource" NOT NULL DEFAULT 'SEED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedMeetPoint_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AreaDirectory_normalizedLabel_key" ON "AreaDirectory"("normalizedLabel");
CREATE INDEX "AreaDirectory_label_idx" ON "AreaDirectory"("label");
CREATE INDEX "SavedMeetPoint_areaLabel_idx" ON "SavedMeetPoint"("areaLabel");
CREATE INDEX "SavedMeetPoint_normalizedArea_idx" ON "SavedMeetPoint"("normalizedArea");
