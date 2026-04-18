import { Router } from "express";
import { authMiddleware } from "../../common/middleware/authMiddleware";
import { validateRequest } from "../../common/middleware/validateRequest";
import { notificationsController } from "./notifications.controller";
import {
  getNotificationsQuerySchema,
  notificationIdParamSchema,
  testNotificationSchema
} from "./notifications.validator";

const router = Router();

router.use(authMiddleware);

router.get("/", validateRequest({ query: getNotificationsQuerySchema }), notificationsController.list);
router.get("/unread-count", notificationsController.getUnreadCount);
router.patch("/read-all", notificationsController.markAllAsRead);
router.patch(
  "/:id/read",
  validateRequest({ params: notificationIdParamSchema }),
  notificationsController.markAsRead
);
router.patch(
  "/:id/archive",
  validateRequest({ params: notificationIdParamSchema }),
  notificationsController.archive
);
router.post("/test", validateRequest({ body: testNotificationSchema }), notificationsController.sendTest);

export const notificationsRoutes = router;
