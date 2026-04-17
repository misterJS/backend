import assert from "node:assert/strict";
import test from "node:test";
import { KycStatus, ReportSeverity, TripLeaderBadgeStatus, TripStatus, TripType } from "@prisma/client";
import { buildTripHistoryOwnershipWhere } from "../trips/trips.repository";
import { TripLeaderService } from "./tripLeader.service";

test("buildTripHistoryOwnershipWhere includes userId, leaderId, and createdById ownership", () => {
  const where = buildTripHistoryOwnershipWhere("user-1");

  assert.deepEqual(where, {
    OR: [{ userId: "user-1" }, { leaderId: "user-1" }, { createdById: "user-1" }]
  });
});

test("refreshUserTripStatsAndEligibility counts completed history trips consistently", async () => {
  const userId = "user-1";
  const state = {
    user: {
      id: userId,
      kycStatus: KycStatus.VERIFIED,
      isTripLeaderEligible: false,
      tripLeaderBadgeStatus: TripLeaderBadgeStatus.NONE as TripLeaderBadgeStatus,
      nickname: "Alya",
      phoneNumber: "081111111111",
      vehicleType: null,
      verificationStatus: "BASIC_VERIFIED",
      ratingAverage: 0,
      ratingCount: 0,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      tripStats: null as null | {
        successfulTripCount: number;
        canceledTripCount: number;
        reportedTripCount: number;
        lastTripCompletedAt: Date | null;
      }
    }
  };

  const trips = [
    {
      id: "trip-completed-owner",
      userId,
      leaderId: userId,
      createdById: userId,
      tripType: TripType.REALTIME,
      status: TripStatus.COMPLETED,
      completedAt: new Date("2026-04-12T10:00:00.000Z"),
      reports: []
    },
    {
      id: "trip-completed-createdby-only",
      userId: "owner-legacy",
      leaderId: "leader-legacy",
      createdById: userId,
      tripType: TripType.REALTIME,
      status: TripStatus.COMPLETED,
      completedAt: new Date("2026-04-13T10:00:00.000Z"),
      reports: []
    },
    {
      id: "trip-cancelled",
      userId,
      leaderId: userId,
      createdById: userId,
      tripType: TripType.REALTIME,
      status: TripStatus.CANCELED,
      completedAt: null,
      reports: []
    },
    {
      id: "trip-completed-reported",
      userId,
      leaderId: userId,
      createdById: userId,
      tripType: TripType.SCHEDULED,
      status: TripStatus.COMPLETED,
      completedAt: new Date("2026-04-14T10:00:00.000Z"),
      reports: [{ reportedUserId: userId, severity: ReportSeverity.SEVERE }]
    }
  ];

  const isOwnedByUser = (trip: (typeof trips)[number], targetUserId: string) =>
    trip.userId === targetUserId ||
    trip.leaderId === targetUserId ||
    trip.createdById === targetUserId;

  const fakeDb = {
    trip: {
      count: async ({ where }: { where: { AND?: Array<Record<string, unknown>>; leaderId?: string; tripType?: TripType; status?: { in: TripStatus[] } } }) => {
        if (where.leaderId) {
          return 0;
        }

        const clauses = where.AND ?? [];
        const statusClause = clauses.find((clause) => "status" in clause) as
          | { status?: TripStatus }
          | undefined;
        const reportsClause = clauses.find((clause) => "reports" in clause) as
          | { reports?: { none?: { reportedUserId: string; severity: ReportSeverity }; some?: { reportedUserId: string; severity: ReportSeverity } } }
          | undefined;

        return trips.filter((trip) => {
          if (!isOwnedByUser(trip, userId)) {
            return false;
          }

          if (statusClause?.status && trip.status !== statusClause.status) {
            return false;
          }

          if (reportsClause?.reports?.none) {
            return !trip.reports.some(
              (report) =>
                report.reportedUserId === reportsClause.reports?.none?.reportedUserId &&
                report.severity === reportsClause.reports?.none?.severity
            );
          }

          if (reportsClause?.reports?.some) {
            return trip.reports.some(
              (report) =>
                report.reportedUserId === reportsClause.reports?.some?.reportedUserId &&
                report.severity === reportsClause.reports?.some?.severity
            );
          }

          return true;
        }).length;
      },
      findFirst: async () => ({
        completedAt: new Date("2026-04-14T10:00:00.000Z")
      })
    },
    user: {
      findUnique: async () => state.user,
      update: async ({ data }: { data: { isTripLeaderEligible: boolean; tripLeaderBadgeStatus: TripLeaderBadgeStatus } }) => {
        state.user.isTripLeaderEligible = data.isTripLeaderEligible;
        state.user.tripLeaderBadgeStatus = data.tripLeaderBadgeStatus;
        return state.user;
      }
    },
    userTripStats: {
      upsert: async ({ update, create }: { update: typeof state.user.tripStats; create: NonNullable<typeof state.user.tripStats> & { userId: string } }) => {
        state.user.tripStats = update ?? {
          successfulTripCount: create.successfulTripCount,
          canceledTripCount: create.canceledTripCount,
          reportedTripCount: create.reportedTripCount,
          lastTripCompletedAt: create.lastTripCompletedAt
        };
        return state.user.tripStats;
      }
    },
    $transaction: async (operations: Array<Promise<unknown>>) => Promise.all(operations)
  };

  const service = new TripLeaderService(fakeDb as never);
  const result = await service.refreshUserTripStatsAndEligibility(userId);

  assert.ok(result);
  assert.equal(result?.successfulTripCount, 2);
  assert.equal(result?.canceledTripCount, 1);
  assert.equal(result?.reportedTripCount, 1);
  assert.equal(result?.lastTripCompletedAt?.toISOString(), "2026-04-14T10:00:00.000Z");
  assert.equal(result?.isTripLeaderEligible, false);
});
