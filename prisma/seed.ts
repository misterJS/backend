import {
  ConvoyStatus,
  KycStatus,
  MatchStatus,
  PrismaClient,
  TripLeaderBadgeStatus,
  TripStatus,
  TripType,
  VerificationStatus,
  VehicleType
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.rating.deleteMany();
  await prisma.report.deleteMany();
  await prisma.guardianContact.deleteMany();
  await prisma.convoySession.deleteMany();
  await prisma.matchRequest.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.otpCode.deleteMany();
  await prisma.user.deleteMany();

  const users = await Promise.all([
    prisma.user.create({
      data: {
        phoneNumber: "081111111111",
        nickname: "Alya",
        vehicleType: VehicleType.MOTOR,
        verificationStatus: VerificationStatus.BASIC_VERIFIED,
        kycStatus: KycStatus.VERIFIED
      }
    }),
    prisma.user.create({
      data: {
        phoneNumber: "082222222222",
        nickname: "Bima",
        vehicleType: VehicleType.MOTOR,
        verificationStatus: VerificationStatus.FULLY_VERIFIED,
        kycStatus: KycStatus.VERIFIED
      }
    }),
    prisma.user.create({
      data: {
        phoneNumber: "083333333333",
        nickname: "Caca",
        vehicleType: VehicleType.CAR,
        verificationStatus: VerificationStatus.BASIC_VERIFIED,
        kycStatus: KycStatus.PENDING
      }
    }),
    prisma.user.create({
      data: {
        phoneNumber: "084444444444",
        nickname: "Dion",
        vehicleType: VehicleType.MOTOR,
        verificationStatus: VerificationStatus.UNVERIFIED,
        kycStatus: KycStatus.REJECTED
      }
    }),
    prisma.user.create({
      data: {
        phoneNumber: "085555555555",
        nickname: "Eka",
        vehicleType: VehicleType.WALK,
        verificationStatus: VerificationStatus.BASIC_VERIFIED,
        kycStatus: KycStatus.VERIFIED
      }
    })
  ]);

  const activeTrips = await Promise.all([
    prisma.trip.create({
      data: {
        userId: users[0].id,
        createdById: users[0].id,
        leaderId: users[0].id,
        tripType: TripType.SCHEDULED,
        startArea: "Bekasi Timur",
        destinationArea: "Tambun",
        vehicleType: VehicleType.MOTOR,
        departureTime: new Date(Date.now() + 60 * 60 * 1000),
        wantsCompanion: true,
        status: TripStatus.OPEN,
        currentParticipants: 1
      }
    }),
    prisma.trip.create({
      data: {
        userId: users[1].id,
        createdById: users[1].id,
        leaderId: users[1].id,
        tripType: TripType.SCHEDULED,
        startArea: "Bekasi Timur",
        destinationArea: "Cibitung",
        vehicleType: VehicleType.MOTOR,
        departureTime: new Date(Date.now() + 90 * 60 * 1000),
        wantsCompanion: true,
        status: TripStatus.OPEN,
        currentParticipants: 1
      }
    }),
    prisma.trip.create({
      data: {
        userId: users[2].id,
        createdById: users[2].id,
        leaderId: users[2].id,
        tripType: TripType.REALTIME,
        startArea: "Tambun",
        destinationArea: "Cikarang",
        vehicleType: VehicleType.CAR,
        departureTime: new Date(Date.now() + 120 * 60 * 1000),
        wantsCompanion: true,
        status: TripStatus.OPEN,
        currentParticipants: 1
      }
    }),
    prisma.trip.create({
      data: {
        userId: users[3].id,
        createdById: users[3].id,
        leaderId: users[3].id,
        tripType: TripType.REALTIME,
        startArea: "Bekasi Barat",
        destinationArea: "Cikarang",
        vehicleType: VehicleType.MOTOR,
        departureTime: new Date(Date.now() + 150 * 60 * 1000),
        wantsCompanion: true,
        status: TripStatus.OPEN,
        currentParticipants: 1
      }
    })
  ]);

  const completedRequesterTrip = await prisma.trip.create({
    data: {
      userId: users[4].id,
      createdById: users[4].id,
      leaderId: users[4].id,
      tripType: TripType.REALTIME,
      startArea: "Cibitung",
      destinationArea: "Bekasi Timur",
      vehicleType: VehicleType.WALK,
      departureTime: new Date(Date.now() - 3 * 60 * 60 * 1000),
      wantsCompanion: true,
      status: TripStatus.COMPLETED,
      currentParticipants: 1
    }
  });

  const completedCandidateTrip = await prisma.trip.create({
    data: {
      userId: users[0].id,
      createdById: users[0].id,
      leaderId: users[0].id,
      tripType: TripType.REALTIME,
      startArea: "Cibitung",
      destinationArea: "Bekasi Timur",
      vehicleType: VehicleType.WALK,
      departureTime: new Date(Date.now() - 3 * 60 * 60 * 1000),
      wantsCompanion: true,
      status: TripStatus.COMPLETED,
      currentParticipants: 1
    }
  });

  const completedMatch = await prisma.matchRequest.create({
    data: {
      requesterTripId: completedRequesterTrip.id,
      candidateTripId: completedCandidateTrip.id,
      status: MatchStatus.COMPLETED,
      similarityScore: 95,
      meetPointId: "mp-4"
    }
  });

  await prisma.convoySession.create({
    data: {
      matchRequestId: completedMatch.id,
      status: ConvoyStatus.COMPLETED,
      startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      endedAt: new Date(Date.now() - 60 * 60 * 1000)
    }
  });

  await prisma.guardianContact.create({
    data: {
      tripId: activeTrips[0].id,
      name: "Ibu Alya",
      phoneNumber: "081299999999",
      shareToken: "guardian-seed-token"
    }
  });

  await prisma.rating.createMany({
    data: [
      {
        tripId: completedRequesterTrip.id,
        fromUserId: users[4].id,
        toUserId: users[0].id,
        score: 5,
        review: "Teman konvoi yang komunikatif."
      },
      {
        tripId: completedRequesterTrip.id,
        fromUserId: users[0].id,
        toUserId: users[4].id,
        score: 4,
        review: "Perjalanan aman dan tepat waktu."
      }
    ]
  });

  await prisma.user.update({
    where: { id: users[0].id },
    data: {
      ratingAverage: 5,
      ratingCount: 1,
      tripLeaderBadgeStatus: TripLeaderBadgeStatus.ELIGIBLE
    }
  });

  await prisma.user.update({
    where: { id: users[4].id },
    data: {
      ratingAverage: 4,
      ratingCount: 1
    }
  });

  await prisma.userTripStats.createMany({
    data: [
      {
        userId: users[0].id,
        successfulTripCount: 5,
        canceledTripCount: 0,
        reportedTripCount: 0,
        lastTripCompletedAt: new Date(Date.now() - 60 * 60 * 1000)
      },
      {
        userId: users[1].id,
        successfulTripCount: 2,
        canceledTripCount: 0,
        reportedTripCount: 0
      },
      {
        userId: users[4].id,
        successfulTripCount: 1,
        canceledTripCount: 0,
        reportedTripCount: 0,
        lastTripCompletedAt: new Date(Date.now() - 60 * 60 * 1000)
      }
    ]
  });

  await prisma.tripParticipant.createMany({
    data: [
      ...activeTrips.map((trip, index) => ({
        tripId: trip.id,
        userId: users[index].id,
        role: "LEADER" as const,
        status: "JOINED" as const
      })),
      {
        tripId: completedRequesterTrip.id,
        userId: users[4].id,
        role: "LEADER" as const,
        status: "COMPLETED" as const,
        completedAt: new Date(Date.now() - 60 * 60 * 1000)
      },
      {
        tripId: completedCandidateTrip.id,
        userId: users[0].id,
        role: "LEADER" as const,
        status: "COMPLETED" as const,
        completedAt: new Date(Date.now() - 60 * 60 * 1000)
      }
    ]
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    // eslint-disable-next-line no-console
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
