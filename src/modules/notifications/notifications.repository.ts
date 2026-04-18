import { NotificationStatus, NotificationType, Prisma } from "@prisma/client";
import { prisma } from "../../prisma/client";
import { CreateNotificationInput, NotificationListItem } from "./notifications.types";

const notificationSelect = {
  id: true,
  title: true,
  body: true,
  type: true,
  status: true,
  createdAt: true,
  readAt: true,
  archivedAt: true,
  actorName: true,
  actorAvatarUrl: true,
  ctaLabel: true,
  data: true
} satisfies Prisma.NotificationSelect;

type ListNotificationsParams = {
  userId: string;
  where?: Prisma.NotificationWhereInput;
  limit: number;
  cursor?: {
    createdAt: Date;
    id: string;
  };
};

export class NotificationsRepository {
  async create(input: CreateNotificationInput) {
    return prisma.notification.create({
      data: {
        userId: input.userId,
        title: input.title,
        body: input.body,
        type: input.type,
        actorName: input.actorName ?? null,
        actorAvatarUrl: input.actorAvatarUrl ?? null,
        ctaLabel: input.ctaLabel ?? null,
        data: input.data ?? Prisma.JsonNull
      },
      select: {
        id: true,
        userId: true,
        title: true,
        body: true,
        type: true,
        status: true,
        actorName: true,
        actorAvatarUrl: true,
        ctaLabel: true,
        data: true,
        readAt: true,
        archivedAt: true,
        createdAt: true
      }
    });
  }

  async list(params: ListNotificationsParams): Promise<NotificationListItem[]> {
    const where: Prisma.NotificationWhereInput = {
      userId: params.userId,
      ...(params.where ?? {})
    };

    if (params.cursor) {
      where.OR = [
        { createdAt: { lt: params.cursor.createdAt } },
        {
          AND: [{ createdAt: params.cursor.createdAt }, { id: { lt: params.cursor.id } }]
        }
      ];
    }

    return prisma.notification.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: params.limit,
      select: notificationSelect
    });
  }

  async countUnread(userId: string) {
    return prisma.notification.count({
      where: {
        userId,
        status: NotificationStatus.UNREAD
      }
    });
  }

  async findOwnedById(userId: string, id: string) {
    return prisma.notification.findFirst({
      where: {
        id,
        userId
      },
      select: {
        id: true,
        status: true,
        readAt: true,
        archivedAt: true
      }
    });
  }

  async markAsRead(userId: string, id: string) {
    return prisma.notification.updateMany({
      where: {
        id,
        userId,
        status: {
          not: NotificationStatus.ARCHIVED
        }
      },
      data: {
        status: NotificationStatus.READ,
        readAt: new Date()
      }
    });
  }

  async archive(userId: string, id: string) {
    return prisma.notification.updateMany({
      where: {
        id,
        userId,
        status: {
          not: NotificationStatus.ARCHIVED
        }
      },
      data: {
        status: NotificationStatus.ARCHIVED,
        archivedAt: new Date(),
        readAt: {
          set: new Date()
        }
      }
    });
  }

  async markAllActiveAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: {
        userId,
        status: NotificationStatus.UNREAD
      },
      data: {
        status: NotificationStatus.READ,
        readAt: new Date()
      }
    });
  }

  buildTabFilter(tab?: string): Prisma.NotificationWhereInput | undefined {
    if (!tab) {
      return undefined;
    }

    if (tab === "activity") {
      return {
        status: {
          not: NotificationStatus.ARCHIVED
        }
      };
    }

    if (tab === "new_matched") {
      return {
        status: {
          not: NotificationStatus.ARCHIVED
        },
        type: {
          in: [NotificationType.MATCH_REQUEST, NotificationType.MATCH_ACCEPTED]
        }
      };
    }

    if (tab === "archive") {
      return {
        status: NotificationStatus.ARCHIVED
      };
    }

    return undefined;
  }
}

export const notificationsRepository = new NotificationsRepository();
