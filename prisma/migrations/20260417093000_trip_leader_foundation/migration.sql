-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TripLeaderBadgeStatus" AS ENUM ('NONE', 'ELIGIBLE', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "TripType" AS ENUM ('REALTIME', 'SCHEDULED');

-- CreateEnum
CREATE TYPE "TripParticipantRole" AS ENUM ('LEADER', 'MEMBER');

-- CreateEnum
CREATE TYPE "TripParticipantStatus" AS ENUM ('JOINED', 'COMPLETED', 'CANCELLED', 'REMOVED');

-- CreateEnum
CREATE TYPE "ReportSeverity" AS ENUM ('LOW', 'MEDIUM', 'SEVERE');

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "kycStatus" "KycStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "tripLeaderBadgeStatus" "TripLeaderBadgeStatus" NOT NULL DEFAULT 'NONE';

-- CreateTable
CREATE TABLE "UserTripStats" (
    "userId" TEXT NOT NULL,
    "successfulTripCount" INTEGER NOT NULL DEFAULT 0,
    "canceledTripCount" INTEGER NOT NULL DEFAULT 0,
    "reportedTripCount" INTEGER NOT NULL DEFAULT 0,
    "lastTripCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserTripStats_pkey" PRIMARY KEY ("userId")
);

-- AlterTable
ALTER TABLE "Trip"
ADD COLUMN "createdById" TEXT,
ADD COLUMN "leaderId" TEXT,
ADD COLUMN "tripType" "TripType" NOT NULL DEFAULT 'REALTIME',
ADD COLUMN "participantCount" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "completedAt" TIMESTAMP(3);

UPDATE "Trip"
SET "createdById" = "userId",
    "leaderId" = "userId";

ALTER TABLE "Trip"
ALTER COLUMN "leaderId" SET NOT NULL;

-- CreateTable
CREATE TABLE "TripParticipant" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "TripParticipantRole" NOT NULL DEFAULT 'MEMBER',
    "status" "TripParticipantStatus" NOT NULL DEFAULT 'JOINED',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TripParticipant_pkey" PRIMARY KEY ("id")
);

INSERT INTO "TripParticipant" ("id", "tripId", "userId", "role", "status", "joinedAt", "createdAt", "updatedAt")
SELECT
  CONCAT('tp_', "id"),
  "id",
  "leaderId",
  'LEADER'::"TripParticipantRole",
  CASE
    WHEN "status" = 'COMPLETED' THEN 'COMPLETED'::"TripParticipantStatus"
    WHEN "status" = 'CANCELLED' THEN 'CANCELLED'::"TripParticipantStatus"
    ELSE 'JOINED'::"TripParticipantStatus"
  END,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Trip";

-- AlterTable
ALTER TABLE "Report"
ADD COLUMN "severity" "ReportSeverity" NOT NULL DEFAULT 'LOW';

-- CreateIndex
CREATE INDEX "Trip_leaderId_status_idx" ON "Trip"("leaderId", "status");

-- CreateIndex
CREATE INDEX "Trip_tripType_status_idx" ON "Trip"("tripType", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TripParticipant_tripId_userId_key" ON "TripParticipant"("tripId", "userId");

-- CreateIndex
CREATE INDEX "TripParticipant_userId_status_idx" ON "TripParticipant"("userId", "status");

-- AddForeignKey
ALTER TABLE "UserTripStats" ADD CONSTRAINT "UserTripStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripParticipant" ADD CONSTRAINT "TripParticipant_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripParticipant" ADD CONSTRAINT "TripParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
