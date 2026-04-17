import { Router } from "express";
import { authMiddleware } from "../../common/middleware/authMiddleware";
import { tripLeaderEligibilityGuard } from "../../common/middleware/tripLeaderEligibilityGuard";
import { validateRequest } from "../../common/middleware/validateRequest";
import { tripsController } from "./trips.controller";
import { createTripSchema, tripIdParamSchema, tripsQuerySchema } from "./trips.validator";

const router = Router();

router.use(authMiddleware);

router.post(
  "/",
  validateRequest({ body: createTripSchema }),
  tripLeaderEligibilityGuard,
  tripsController.createTrip
);
router.get("/active", validateRequest({ query: tripsQuerySchema }), tripsController.getActiveTrips);
router.get("/my", tripsController.getMyTrips);
router.post("/:tripId/join", validateRequest({ params: tripIdParamSchema }), tripsController.joinTrip);
router.get("/:tripId", validateRequest({ params: tripIdParamSchema }), tripsController.getTripById);
router.patch("/:tripId/end", validateRequest({ params: tripIdParamSchema }), tripsController.endTrip);
router.patch(
  "/:tripId/cancel",
  validateRequest({ params: tripIdParamSchema }),
  tripsController.cancelTrip
);
router.delete("/:tripId", validateRequest({ params: tripIdParamSchema }), tripsController.deleteTrip);

export const tripsRoutes = router;
