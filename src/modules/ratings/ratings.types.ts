export type CreateRatingInput = {
  tripId: string;
  toUserId: string;
  score: number;
  review?: string | null;
};
