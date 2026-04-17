import {
  ConvoyStatus,
  MatchStatus,
  VerificationStatus,
  VehicleType
} from "@prisma/client";

export type MatchCandidate = {
  userId: string;
  nickname: string | null;
  verificationStatus: VerificationStatus;
  vehicleType: VehicleType | null;
  tripId: string;
  similarityScore: number;
};

export type CreateMatchRequestInput = {
  requesterTripId: string;
  candidateTripId: string;
  meetPointId?: string | null;
};

export type MatchIdParams = {
  matchId: string;
};

export type MatchDetail = {
  id: string;
  status: MatchStatus;
  similarityScore: number;
  meetPointId: string | null;
  requesterTrip: {
    id: string;
    userId: string;
    startArea: string;
    destinationArea: string;
    vehicleType: VehicleType;
    status: string;
    user: {
      id: string;
      nickname: string | null;
      verificationStatus: VerificationStatus;
    };
  };
  candidateTrip: {
    id: string;
    userId: string;
    startArea: string;
    destinationArea: string;
    vehicleType: VehicleType;
    status: string;
    user: {
      id: string;
      nickname: string | null;
      verificationStatus: VerificationStatus;
    };
  };
  convoySession: {
    id: string;
    status: ConvoyStatus;
    startedAt: Date | null;
    endedAt: Date | null;
  } | null;
  createdAt: Date;
  updatedAt: Date;
};
