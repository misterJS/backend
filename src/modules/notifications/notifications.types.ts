import { NotificationStatus, NotificationType, Prisma } from "@prisma/client";

export type NotificationData = Prisma.InputJsonValue | null;

export type CreateNotificationInput = {
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  actorName?: string | null;
  actorAvatarUrl?: string | null;
  ctaLabel?: string | null;
  data?: NotificationData;
};

export type NotificationsTab = "activity" | "new_matched" | "archive";

export type GetNotificationsQuery = {
  tab?: NotificationsTab;
  status?: NotificationStatus;
  limit?: number;
  cursor?: string;
};

export type NotificationListItem = {
  id: string;
  title: string;
  body: string;
  type: NotificationType;
  status: NotificationStatus;
  createdAt: Date;
  readAt: Date | null;
  archivedAt: Date | null;
  actorName: string | null;
  actorAvatarUrl: string | null;
  ctaLabel: string | null;
  data: Prisma.JsonValue | null;
};
