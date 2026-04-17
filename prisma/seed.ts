import {
  AreaLevel,
  ConvoyStatus,
  DirectoryEntrySource,
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
  await prisma.savedMeetPoint.deleteMany();
  await prisma.areaDirectory.deleteMany();
  await prisma.rating.deleteMany();
  await prisma.report.deleteMany();
  await prisma.guardianContact.deleteMany();
  await prisma.convoySession.deleteMany();
  await prisma.matchRequest.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.otpCode.deleteMany();
  await prisma.user.deleteMany();

  const areaIds = new Map<string, string>();
  const createArea = async (data: {
    key: string;
    label: string;
    normalizedLabel: string;
    adminCode: string;
    level: AreaLevel;
    description: string;
    latitude?: number;
    longitude?: number;
    parentKey?: string;
  }) => {
    const parentId = data.parentKey ? areaIds.get(data.parentKey) ?? null : null;
    const segments = data.adminCode.split(".");

    const createdArea = await prisma.areaDirectory.create({
      data: {
        label: data.label,
        value: data.label,
        normalizedLabel: data.normalizedLabel,
        adminCode: data.adminCode,
        level: data.level,
        parentId,
        provinceCode: segments[0] ?? null,
        cityCode: segments.length >= 2 ? `${segments[0]}.${segments[1]}` : null,
        districtCode:
          segments.length >= 3 ? `${segments[0]}.${segments[1]}.${segments[2]}` : null,
        villageCode:
          segments.length >= 4
            ? `${segments[0]}.${segments[1]}.${segments[2]}.${segments[3]}`
            : null,
        description: data.description,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        source: DirectoryEntrySource.SEED
      }
    });

    areaIds.set(data.key, createdArea.id);
    return createdArea;
  };

  await createArea({
    key: "jawa-barat",
    label: "Jawa Barat",
    normalizedLabel: "jawa barat",
    adminCode: "32",
    level: AreaLevel.PROVINCE,
    description: "Provinsi Jawa Barat",
    latitude: -6.9147,
    longitude: 107.6098
  });

  await createArea({
    key: "kab-bekasi",
    label: "Kabupaten Bekasi",
    normalizedLabel: "kabupaten bekasi",
    adminCode: "32.16",
    level: AreaLevel.CITY,
    description: "Kabupaten Bekasi, Jawa Barat",
    latitude: -6.2416,
    longitude: 107.1458,
    parentKey: "jawa-barat"
  });

  await createArea({
    key: "kota-bekasi",
    label: "Kota Bekasi",
    normalizedLabel: "kota bekasi",
    adminCode: "32.75",
    level: AreaLevel.CITY,
    description: "Kota Bekasi, Jawa Barat",
    latitude: -6.2383,
    longitude: 106.9756,
    parentKey: "jawa-barat"
  });

  await createArea({
    key: "tambun-selatan",
    label: "Tambun Selatan, Kabupaten Bekasi",
    normalizedLabel: "tambun selatan, kabupaten bekasi",
    adminCode: "32.16.07",
    level: AreaLevel.DISTRICT,
    description: "Kecamatan Tambun Selatan, Kabupaten Bekasi",
    latitude: -6.2652,
    longitude: 107.0542,
    parentKey: "kab-bekasi"
  });

  await createArea({
    key: "cibitung",
    label: "Cibitung, Kabupaten Bekasi",
    normalizedLabel: "cibitung, kabupaten bekasi",
    adminCode: "32.16.04",
    level: AreaLevel.DISTRICT,
    description: "Kecamatan Cibitung, Kabupaten Bekasi",
    latitude: -6.2581,
    longitude: 107.0982,
    parentKey: "kab-bekasi"
  });

  await createArea({
    key: "cikarang-utara",
    label: "Cikarang Utara, Kabupaten Bekasi",
    normalizedLabel: "cikarang utara, kabupaten bekasi",
    adminCode: "32.16.03",
    level: AreaLevel.DISTRICT,
    description: "Kecamatan Cikarang Utara, Kabupaten Bekasi",
    latitude: -6.2861,
    longitude: 107.1729,
    parentKey: "kab-bekasi"
  });

  await createArea({
    key: "karangbahagia",
    label: "Karangbahagia, Kabupaten Bekasi",
    normalizedLabel: "karangbahagia, kabupaten bekasi",
    adminCode: "32.16.46",
    level: AreaLevel.DISTRICT,
    description: "Kecamatan Karangbahagia, Kabupaten Bekasi",
    latitude: -6.3014,
    longitude: 107.1585,
    parentKey: "kab-bekasi"
  });

  await createArea({
    key: "bekasi-timur",
    label: "Bekasi Timur, Kota Bekasi",
    normalizedLabel: "bekasi timur, kota bekasi",
    adminCode: "32.75.03",
    level: AreaLevel.DISTRICT,
    description: "Kecamatan Bekasi Timur, Kota Bekasi",
    latitude: -6.2341,
    longitude: 107.0304,
    parentKey: "kota-bekasi"
  });

  await createArea({
    key: "bekasi-barat",
    label: "Bekasi Barat, Kota Bekasi",
    normalizedLabel: "bekasi barat, kota bekasi",
    adminCode: "32.75.01",
    level: AreaLevel.DISTRICT,
    description: "Kecamatan Bekasi Barat, Kota Bekasi",
    latitude: -6.2067,
    longitude: 106.9679,
    parentKey: "kota-bekasi"
  });

  await createArea({
    key: "jatimulya",
    label: "Jatimulya, Tambun Selatan, Kabupaten Bekasi",
    normalizedLabel: "jatimulya, tambun selatan, kabupaten bekasi",
    adminCode: "32.16.07.1001",
    level: AreaLevel.VILLAGE,
    description: "Kelurahan Jatimulya, Kecamatan Tambun Selatan, Kabupaten Bekasi",
    latitude: -6.2642,
    longitude: 107.0562,
    parentKey: "tambun-selatan"
  });

  await createArea({
    key: "mekarsari",
    label: "Mekarsari, Tambun Selatan, Kabupaten Bekasi",
    normalizedLabel: "mekarsari, tambun selatan, kabupaten bekasi",
    adminCode: "32.16.07.1002",
    level: AreaLevel.VILLAGE,
    description: "Kelurahan Mekarsari, Kecamatan Tambun Selatan, Kabupaten Bekasi",
    latitude: -6.2703,
    longitude: 107.0471,
    parentKey: "tambun-selatan"
  });

  await createArea({
    key: "tridaya-sakti",
    label: "Tridaya Sakti, Tambun Selatan, Kabupaten Bekasi",
    normalizedLabel: "tridaya sakti, tambun selatan, kabupaten bekasi",
    adminCode: "32.16.07.1003",
    level: AreaLevel.VILLAGE,
    description: "Kelurahan Tridaya Sakti, Kecamatan Tambun Selatan, Kabupaten Bekasi",
    latitude: -6.2738,
    longitude: 107.0625,
    parentKey: "tambun-selatan"
  });

  await createArea({
    key: "duren-jaya",
    label: "Duren Jaya, Bekasi Timur, Kota Bekasi",
    normalizedLabel: "duren jaya, bekasi timur, kota bekasi",
    adminCode: "32.75.03.1001",
    level: AreaLevel.VILLAGE,
    description: "Kelurahan Duren Jaya, Kecamatan Bekasi Timur, Kota Bekasi",
    latitude: -6.2388,
    longitude: 106.9831,
    parentKey: "bekasi-timur"
  });

  await prisma.savedMeetPoint.createMany({
    data: [
      {
        name: "Indomaret Jatimulya",
        type: "Minimarket",
        address: "Jl. Raya Jatimulya, Tambun Selatan, Bekasi",
        areaId: areaIds.get("jatimulya") ?? null,
        areaLabel: "Jatimulya, Tambun Selatan, Kabupaten Bekasi",
        normalizedArea: "jatimulya, tambun selatan, kabupaten bekasi",
        latitude: -6.2642,
        longitude: 107.0562,
        source: DirectoryEntrySource.SEED
      },
      {
        name: "SPBU Bekasi Timur",
        type: "SPBU",
        address: "Jl. HM Joyomartono, Bekasi Timur, Kota Bekasi",
        areaId: areaIds.get("bekasi-timur") ?? null,
        areaLabel: "Bekasi Timur, Kota Bekasi",
        normalizedArea: "bekasi timur, kota bekasi",
        latitude: -6.2341,
        longitude: 107.0304,
        source: DirectoryEntrySource.SEED
      },
      {
        name: "Gerbang Perumahan Duren Jaya",
        type: "Gerbang Perumahan",
        address: "Jl. Duren Jaya, Bekasi Timur, Kota Bekasi",
        areaId: areaIds.get("duren-jaya") ?? null,
        areaLabel: "Duren Jaya, Bekasi Timur, Kota Bekasi",
        normalizedArea: "duren jaya, bekasi timur, kota bekasi",
        latitude: -6.2388,
        longitude: 106.9831,
        source: DirectoryEntrySource.SEED
      },
      {
        name: "Pos Satpam Cibitung Central",
        type: "Pos Satpam",
        address: "Jl. Teuku Umar, Cibitung, Bekasi",
        areaId: areaIds.get("cibitung") ?? null,
        areaLabel: "Cibitung, Kabupaten Bekasi",
        normalizedArea: "cibitung, kabupaten bekasi",
        latitude: -6.2514,
        longitude: 107.0928,
        source: DirectoryEntrySource.SEED
      }
    ]
  });

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
