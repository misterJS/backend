import { NotificationStatus, NotificationType, Prisma } from "@prisma/client";
import { Expo, ExpoPushErrorTicket, ExpoPushMessage, ExpoPushTicket } from "expo-server-sdk";
import { AppError } from "../../common/errors/appError";
import { normalizeExpoPushToken } from "../../common/utils/normalizeExpoPushToken";
import { env } from "../../config/env";
import { pushTokensRepository } from "../push-tokens/push-tokens.repository";
import { notificationsRepository } from "./notifications.repository";
import { CreateNotificationInput, GetNotificationsQuery } from "./notifications.types";

export type NotificationPayload = {
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

type PushTicketResult = {
  token: string;
  status: ExpoPushTicket["status"];
  id?: string;
  message?: string;
  details?: ExpoPushErrorTicket["details"];
};

type SendPushResult = {
  requestedCount: number;
  deliveredCount: number;
  invalidTokenCount: number;
  tickets: PushTicketResult[];
};

type MatchAcceptedEventInput = {
  recipientUserId: string;
  matchId: string;
  requesterTripId: string;
  candidateTripId: string;
  candidateNickname: string | null;
};

type MatchRequestEventInput = {
  recipientUserId: string;
  matchId: string;
  tripId: string;
  requesterNickname: string | null;
};

type MatchRejectedEventInput = {
  recipientUserId: string;
  matchId: string;
  tripId: string;
};

type GuardianReminderEventInput = {
  recipientUserId: string;
  tripId: string;
  matchId?: string;
};

type TripStartedEventInput = {
  recipientUserIds: string[];
  tripId: string;
  destinationArea: string;
};

type TripCompletedEventInput = {
  recipientUserIds: string[];
  tripId: string;
  destinationArea: string;
};

type AccountVerifiedEventInput = {
  recipientUserId: string;
};

type SystemAlertEventInput = {
  recipientUserId: string;
  title: string;
  body: string;
  ctaLabel?: string | null;
  data?: Prisma.InputJsonValue;
};

export class NotificationsService {
  private readonly expo = new Expo(
    env.EXPO_ACCESS_TOKEN
      ? {
          accessToken: env.EXPO_ACCESS_TOKEN
        }
      : undefined
  );

  validateExpoPushToken(token: string) {
    return Expo.isExpoPushToken(token);
  }

  async sendPushToUser(userId: string, payload: NotificationPayload): Promise<SendPushResult> {
    const activeTokens = await pushTokensRepository.findActiveTokensByUserId(userId);
    const tokenValues = activeTokens.map((token) => token.expoPushToken);

    return this.sendPushToTokens(tokenValues, payload);
  }

  async sendPushToTokens(tokens: string[], payload: NotificationPayload): Promise<SendPushResult> {
    const normalizedTokens = Array.from(
      new Set(tokens.map((token) => normalizeExpoPushToken(token)))
    );
    const validTokens = normalizedTokens.filter((token: string) => this.validateExpoPushToken(token));
    const invalidFormatTokens = normalizedTokens.filter(
      (token: string) => !this.validateExpoPushToken(token)
    );

    if (invalidFormatTokens.length > 0) {
      console.warn("[notifications] Invalid Expo token format detected", {
        invalidFormatTokens
      });
      await pushTokensRepository.deactivateTokens(invalidFormatTokens);
    }

    if (validTokens.length === 0) {
      return {
        requestedCount: normalizedTokens.length,
        deliveredCount: 0,
        invalidTokenCount: invalidFormatTokens.length,
        tickets: []
      };
    }

    const messages: ExpoPushMessage[] = validTokens.map((token) => ({
      to: token,
      sound: "default",
      title: payload.title,
      body: payload.body,
      data: payload.data
    }));

    const chunks = this.expo.chunkPushNotifications(messages);
    const ticketResults: PushTicketResult[] = [];
    const invalidDeviceTokens: string[] = [];
    let tokenCursor = 0;

    for (const chunk of chunks) {
      const chunkTokens = validTokens.slice(tokenCursor, tokenCursor + chunk.length);
      tokenCursor += chunk.length;

      const tickets = await this.expo.sendPushNotificationsAsync(chunk);
      tickets.forEach((ticket, index) => {
        const token = chunkTokens[index];

        if (ticket.status === "ok") {
          ticketResults.push({
            token,
            status: ticket.status,
            id: ticket.id
          });
          return;
        }

        const invalidToken = ticket.details?.error === "DeviceNotRegistered"
          ? ticket.details.expoPushToken ?? token
          : null;

        if (invalidToken) {
          invalidDeviceTokens.push(invalidToken);
        }

        ticketResults.push({
          token,
          status: ticket.status,
          message: ticket.message,
          details: ticket.details
        });
      });
    }

    if (invalidDeviceTokens.length > 0) {
      await pushTokensRepository.deactivateTokens(invalidDeviceTokens);
      console.warn("[notifications] Deactivated invalid Expo device tokens", {
        invalidDeviceTokens
      });
    }

    return {
      requestedCount: normalizedTokens.length,
      deliveredCount: ticketResults.filter((ticket) => ticket.status === "ok").length,
      invalidTokenCount: invalidFormatTokens.length + invalidDeviceTokens.length,
      tickets: ticketResults
    };
  }

  async sendMatchAccepted(input: MatchAcceptedEventInput) {
    return this.createAndDispatch({
      userId: input.recipientUserId,
      title: `${input.candidateNickname ?? "Partner"} matched ke kamu`,
      body: "Kamu punya partner baru untuk perjalanan berikutnya. Lanjut cek titik temu.",
      type: NotificationType.MATCH_ACCEPTED,
      actorName: input.candidateNickname ?? null,
      ctaLabel: "View",
      data: {
        matchId: input.matchId,
        tripId: input.requesterTripId,
        candidateTripId: input.candidateTripId,
        action: "OPEN_MATCH_DETAIL"
      }
    });
  }

  async sendMatchRequest(input: MatchRequestEventInput) {
    return this.createAndDispatch({
      userId: input.recipientUserId,
      title: `${input.requesterNickname ?? "Partner"} ngajak trip bareng`,
      body: "Rute kamu mirip dan titik berangkatnya berdekatan. Cek detail match sekarang.",
      type: NotificationType.MATCH_REQUEST,
      actorName: input.requesterNickname ?? null,
      ctaLabel: "View",
      data: {
        matchId: input.matchId,
        tripId: input.tripId,
        action: "OPEN_MATCH_DETAIL"
      }
    });
  }

  async sendMatchRejected(input: MatchRejectedEventInput) {
    return this.createAndDispatch({
      userId: input.recipientUserId,
      title: "Ajakan trip belum diterima",
      body: "Partner yang kamu pilih belum bisa bergabung. Kamu bisa cari kandidat lain.",
      type: NotificationType.MATCH_REJECTED,
      ctaLabel: "View",
      data: {
        matchId: input.matchId,
        tripId: input.tripId,
        action: "OPEN_MATCH_DETAIL"
      }
    });
  }

  async sendGuardianReminder(input: GuardianReminderEventInput) {
    return this.createAndDispatch({
      userId: input.recipientUserId,
      title: "Trip kamu mulai sebentar lagi",
      body: "Pastikan guardian sudah ditambahkan dan kamu siap menuju meet point publik.",
      type: NotificationType.TRIP_REMINDER,
      ctaLabel: "View",
      data: {
        tripId: input.tripId,
        matchId: input.matchId ?? null,
        action: "OPEN_TRIP_DETAIL"
      }
    });
  }

  async sendTripStarted(input: TripStartedEventInput) {
    const sendResults = await Promise.all(
      input.recipientUserIds.map((recipientUserId) =>
        this.sendPushToUser(recipientUserId, {
          title: "Perjalanan dimulai",
          body: `Trip menuju ${input.destinationArea} sudah dimulai.`,
          data: {
            type: "trip_started",
            tripId: input.tripId,
            destinationArea: input.destinationArea
          }
        })
      )
    );

    return {
      recipients: input.recipientUserIds.length,
      results: sendResults
    };
  }

  async sendTripCompleted(input: TripCompletedEventInput) {
    const sendResults = await Promise.all(
      input.recipientUserIds.map((recipientUserId) =>
        this.sendPushToUser(recipientUserId, {
          title: "Perjalanan selesai",
          body: `Trip menuju ${input.destinationArea} sudah selesai. Terima kasih sudah bareng-in.`,
          data: {
            type: "trip_completed",
            tripId: input.tripId,
            destinationArea: input.destinationArea
          }
        })
      )
    );

    return {
      recipients: input.recipientUserIds.length,
      results: sendResults
    };
  }

  async sendAccountVerified(input: AccountVerifiedEventInput) {
    return this.createAndDispatch({
      userId: input.recipientUserId,
      title: "Akun kamu sudah terverifikasi",
      body: "Status verifikasi berhasil diperbarui. Sekarang trust profile kamu makin kuat.",
      type: NotificationType.ACCOUNT_VERIFIED,
      ctaLabel: "View",
      data: {
        action: "OPEN_PROFILE"
      }
    });
  }

  async sendSystemAlert(input: SystemAlertEventInput) {
    return this.createAndDispatch({
      userId: input.recipientUserId,
      title: input.title,
      body: input.body,
      type: NotificationType.SYSTEM_ALERT,
      ctaLabel: input.ctaLabel ?? "View",
      data: input.data
    });
  }

  async listForUser(userId: string, rawQuery: unknown) {
    const query = rawQuery as GetNotificationsQuery;
    const take = (query.limit ?? 20) + 1;
    const cursor = this.decodeCursor(query.cursor);
    const filters = [
      notificationsRepository.buildTabFilter(query.tab),
      query.status ? ({ status: query.status } satisfies Prisma.NotificationWhereInput) : undefined
    ].filter(Boolean) as Prisma.NotificationWhereInput[];

    const items = await notificationsRepository.list({
      userId,
      limit: take,
      cursor,
      where: filters.length > 0 ? { AND: filters } : undefined
    });
    const hasNextPage = items.length > (query.limit ?? 20);
    const visibleItems = hasNextPage ? items.slice(0, query.limit ?? 20) : items;
    const unreadCount = await notificationsRepository.countUnread(userId);

    return {
      items: visibleItems,
      nextCursor: hasNextPage ? this.encodeCursor(visibleItems[visibleItems.length - 1]) : null,
      unreadCount
    };
  }

  async markAsRead(userId: string, id: string) {
    const notification = await notificationsRepository.findOwnedById(userId, id);

    if (!notification) {
      throw new AppError("Notification not found", 404);
    }

    if (notification.status === NotificationStatus.ARCHIVED) {
      return {
        id: notification.id,
        status: notification.status,
        readAt: notification.readAt
      };
    }

    if (notification.status !== NotificationStatus.READ) {
      await notificationsRepository.markAsRead(userId, id);
    }

    const updated = await notificationsRepository.findOwnedById(userId, id);
    if (!updated) {
      throw new AppError("Notification not found", 404);
    }

    return {
      id: updated.id,
      status: updated.status,
      readAt: updated.readAt
    };
  }

  async archive(userId: string, id: string) {
    const notification = await notificationsRepository.findOwnedById(userId, id);

    if (!notification) {
      throw new AppError("Notification not found", 404);
    }

    if (notification.status !== NotificationStatus.ARCHIVED) {
      await notificationsRepository.archive(userId, id);
    }

    const updated = await notificationsRepository.findOwnedById(userId, id);
    if (!updated) {
      throw new AppError("Notification not found", 404);
    }

    return {
      id: updated.id,
      status: updated.status,
      archivedAt: updated.archivedAt
    };
  }

  async markAllAsRead(userId: string) {
    const result = await notificationsRepository.markAllActiveAsRead(userId);

    return {
      updatedCount: result.count
    };
  }

  async getUnreadCount(userId: string) {
    const unreadCount = await notificationsRepository.countUnread(userId);

    return {
      unreadCount
    };
  }

  private async createAndDispatch(input: CreateNotificationInput) {
    const notification = await notificationsRepository.create(input);
    const pushData = this.buildPushData(notification.id, input.type, input.data);
    const pushResult = await this.sendPushToUser(input.userId, {
      title: input.title,
      body: input.body,
      data: pushData
    });

    return {
      notification,
      push: pushResult
    };
  }

  private buildPushData(
    notificationId: string,
    type: NotificationType,
    data?: Prisma.InputJsonValue | null
  ) {
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return {
        type,
        notificationId
      };
    }

    return {
      type,
      notificationId,
      ...(data as Record<string, unknown>)
    };
  }

  private encodeCursor(item: { createdAt: Date; id: string }) {
    return Buffer.from(
      JSON.stringify({
        createdAt: item.createdAt.toISOString(),
        id: item.id
      }),
      "utf8"
    ).toString("base64url");
  }

  private decodeCursor(cursor?: string) {
    if (!cursor) {
      return undefined;
    }

    try {
      const decoded = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as {
        createdAt: string;
        id: string;
      };

      return {
        createdAt: new Date(decoded.createdAt),
        id: decoded.id
      };
    } catch (_error) {
      throw new AppError("Invalid cursor", 400);
    }
  }
}

export const notificationsService = new NotificationsService();
