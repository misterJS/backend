import { Request, Response } from "express";
import { AppError } from "../../common/errors/appError";
import { asyncHandler } from "../../common/utils/asyncHandler";
import { successResponse } from "../../common/utils/apiResponse";
import { notificationsService } from "./notifications.service";

class NotificationsController {
  list = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.currentUser?.userId;
    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    const result = await notificationsService.listForUser(userId, req.query);
    res.json(successResponse("Notifications fetched", result));
  });

  getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.currentUser?.userId;
    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    const result = await notificationsService.getUnreadCount(userId);
    res.json(successResponse("Unread count fetched", result));
  });

  markAsRead = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.currentUser?.userId;
    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    const result = await notificationsService.markAsRead(userId, String(req.params.id));
    res.json(successResponse("Notification marked as read", result));
  });

  archive = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.currentUser?.userId;
    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    const result = await notificationsService.archive(userId, String(req.params.id));
    res.json(successResponse("Notification archived", result));
  });

  markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.currentUser?.userId;
    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    const result = await notificationsService.markAllAsRead(userId);
    res.json(successResponse("All notifications marked as read", result));
  });

  sendTest = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.currentUser?.userId;
    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    const result = await notificationsService.sendPushToUser(userId, {
      title: req.body.title ?? "Barengin Test Notification",
      body: req.body.body ?? "Push notification backend is working.",
      data: req.body.data ?? {
        type: "test_notification"
      }
    });

    res.json(successResponse("Test notification sent", result));
  });
}

export const notificationsController = new NotificationsController();
