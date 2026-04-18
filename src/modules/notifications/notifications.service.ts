import { Expo, ExpoPushErrorTicket, ExpoPushMessage, ExpoPushTicket } from "expo-server-sdk";
import { env } from "../../config/env";
import { pushTokensRepository } from "../push-tokens/push-tokens.repository";

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
  requesterTripId: string;
  candidateTripId: string;
  candidateNickname: string | null;
};

type GuardianReminderEventInput = {
  recipientUserId: string;
  tripId: string;
  guardianName: string;
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
    const normalizedTokens = Array.from(new Set(tokens));
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
    return this.sendPushToUser(input.recipientUserId, {
      title: "Match diterima",
      body: `${input.candidateNickname ?? "Partner"} menerima permintaan match kamu.`,
      data: {
        type: "match_accepted",
        requesterTripId: input.requesterTripId,
        candidateTripId: input.candidateTripId
      }
    });
  }

  async sendGuardianReminder(input: GuardianReminderEventInput) {
    return this.sendPushToUser(input.recipientUserId, {
      title: "Reminder guardian",
      body: `Jangan lupa update guardian ${input.guardianName} untuk perjalananmu.`,
      data: {
        type: "guardian_reminder",
        tripId: input.tripId,
        guardianName: input.guardianName
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
}

export const notificationsService = new NotificationsService();
