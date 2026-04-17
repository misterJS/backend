-- Add Day 1 backend foundation fields first so data can be backfilled safely.
ALTER TABLE "User"
ADD COLUMN "isTripLeaderEligible" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Trip"
ADD COLUMN "minParticipants" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN "maxParticipants" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN "currentParticipants" INTEGER NOT NULL DEFAULT 1;

UPDATE "Trip"
SET "currentParticipants" = "participantCount";

ALTER TYPE "TripStatus" RENAME TO "TripStatus_old";

CREATE TYPE "TripStatus" AS ENUM ('draft', 'open', 'ongoing', 'completed', 'canceled');

ALTER TABLE "Trip"
ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "Trip"
ALTER COLUMN "status" TYPE "TripStatus"
USING (
  CASE "status"::text
    WHEN 'ACTIVE' THEN 'open'
    WHEN 'MATCHING' THEN 'open'
    WHEN 'MATCHED' THEN 'open'
    WHEN 'IN_CONVOY' THEN 'ongoing'
    WHEN 'COMPLETED' THEN 'completed'
    WHEN 'CANCELLED' THEN 'canceled'
    ELSE 'open'
  END
)::"TripStatus";

ALTER TABLE "Trip"
ALTER COLUMN "status" SET DEFAULT 'open';

DROP TYPE "TripStatus_old";

ALTER TABLE "Trip"
DROP COLUMN "participantCount";

UPDATE "User" AS u
SET
  "isTripLeaderEligible" = (
    u."kycStatus" = 'VERIFIED'
    AND COALESCE(stats."successfulTripCount", 0) >= 5
    AND u."tripLeaderBadgeStatus" <> 'SUSPENDED'
  ),
  "tripLeaderBadgeStatus" = CASE
    WHEN u."tripLeaderBadgeStatus" = 'SUSPENDED' THEN 'SUSPENDED'::"TripLeaderBadgeStatus"
    WHEN u."kycStatus" = 'VERIFIED' AND COALESCE(stats."successfulTripCount", 0) >= 5 THEN
      CASE
        WHEN EXISTS (
          SELECT 1
          FROM "Trip" t
          WHERE t."leaderId" = u."id"
            AND t."tripType" = 'SCHEDULED'
            AND t."status" IN ('open', 'ongoing')
        ) THEN 'ACTIVE'::"TripLeaderBadgeStatus"
        ELSE 'ELIGIBLE'::"TripLeaderBadgeStatus"
      END
    ELSE 'NONE'::"TripLeaderBadgeStatus"
  END
FROM "UserTripStats" AS stats
WHERE stats."userId" = u."id";
