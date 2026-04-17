ALTER TYPE "DirectoryEntrySource" ADD VALUE 'OFFICIAL_IMPORT';

ALTER TABLE "AreaDirectory"
ADD COLUMN "adminCode" TEXT,
ADD COLUMN "countryCode" TEXT NOT NULL DEFAULT 'ID',
ADD COLUMN "parentId" TEXT,
ADD COLUMN "provinceCode" TEXT,
ADD COLUMN "cityCode" TEXT,
ADD COLUMN "districtCode" TEXT,
ADD COLUMN "villageCode" TEXT,
ADD COLUMN "latitude" DOUBLE PRECISION,
ADD COLUMN "longitude" DOUBLE PRECISION,
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "SavedMeetPoint"
ADD COLUMN "areaId" TEXT;

CREATE UNIQUE INDEX "AreaDirectory_adminCode_key" ON "AreaDirectory"("adminCode");
CREATE INDEX "AreaDirectory_level_label_idx" ON "AreaDirectory"("level", "label");
CREATE INDEX "AreaDirectory_parentId_idx" ON "AreaDirectory"("parentId");
CREATE INDEX "AreaDirectory_provinceCode_cityCode_districtCode_villageCode_idx"
ON "AreaDirectory"("provinceCode", "cityCode", "districtCode", "villageCode");
CREATE INDEX "SavedMeetPoint_areaId_idx" ON "SavedMeetPoint"("areaId");

ALTER TABLE "AreaDirectory"
ADD CONSTRAINT "AreaDirectory_parentId_fkey"
FOREIGN KEY ("parentId") REFERENCES "AreaDirectory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SavedMeetPoint"
ADD CONSTRAINT "SavedMeetPoint_areaId_fkey"
FOREIGN KEY ("areaId") REFERENCES "AreaDirectory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
