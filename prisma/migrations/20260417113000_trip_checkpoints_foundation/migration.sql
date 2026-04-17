-- CreateEnum
CREATE TYPE "TripCheckpointSourceType" AS ENUM ('DEFAULT', 'CUSTOM');

-- CreateEnum
CREATE TYPE "TripCheckpointType" AS ENUM ('DEPARTURE', 'PICKUP', 'REST', 'SCENIC', 'DESTINATION');

-- CreateTable
CREATE TABLE "TripCheckpoint" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "area" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "sourceType" "TripCheckpointSourceType" NOT NULL DEFAULT 'DEFAULT',
    "checkpointType" "TripCheckpointType" NOT NULL DEFAULT 'REST',
    "sequence" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TripCheckpoint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TripCheckpoint_tripId_sequence_idx" ON "TripCheckpoint"("tripId", "sequence");

-- AddForeignKey
ALTER TABLE "TripCheckpoint" ADD CONSTRAINT "TripCheckpoint_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
