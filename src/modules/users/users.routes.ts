import { Router } from "express";
import { authMiddleware } from "../../common/middleware/authMiddleware";
import { validateRequest } from "../../common/middleware/validateRequest";
import { usersController } from "./users.controller";
import { updateProfileSchema, userIdParamSchema } from "./users.validator";

const router = Router();

router.use(authMiddleware);

router.get("/me", usersController.getMe);
router.get("/me/trip-leader-status", usersController.getMyTripLeaderStatus);
router.patch("/me", validateRequest({ body: updateProfileSchema }), usersController.updateMe);
router.get(
  "/:userId/rating-summary",
  validateRequest({ params: userIdParamSchema }),
  usersController.getRatingSummary
);
router.get(
  "/:userId/trip-stats",
  validateRequest({ params: userIdParamSchema }),
  usersController.getUserTripStats
);

export const usersRoutes = router;
