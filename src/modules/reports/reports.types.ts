export type CreateReportInput = {
  tripId: string;
  reportedUserId: string;
  reason: string;
  description?: string | null;
};
