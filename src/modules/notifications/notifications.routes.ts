import { Router } from "express";
import { authMiddleware } from "../../common/middleware/authMiddleware";
import { validateRequest } from "../../common/middleware/validateRequest";
import { notificationsController } from "./notifications.controller";
import { testNotificationSchema } from "./notifications.validator";

const router = Router();

router.use(authMiddleware);

router.post("/test", validateRequest({ body: testNotificationSchema }), notificationsController.sendTest);

export const notificationsRoutes = router;
