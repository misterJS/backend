import { Router } from "express";
import { authMiddleware } from "../../common/middleware/authMiddleware";
import { validateRequest } from "../../common/middleware/validateRequest";
import { matchingController } from "./matching.controller";
import {
  createMatchRequestSchema,
  matchIdParamSchema,
  tripIdParamSchema
} from "./matching.validator";

const router = Router();

router.use(authMiddleware);

router.get(
  "/candidates/:tripId",
  validateRequest({ params: tripIdParamSchema }),
  matchingController.getCandidates
);
router.get(
  "/trip/:tripId/requests",
  validateRequest({ params: tripIdParamSchema }),
  matchingController.getTripRequests
);
router.post(
  "/request",
  validateRequest({ body: createMatchRequestSchema }),
  matchingController.createRequest
);
router.patch(
  "/:matchId/accept",
  validateRequest({ params: matchIdParamSchema }),
  matchingController.accept
);
router.patch(
  "/:matchId/reject",
  validateRequest({ params: matchIdParamSchema }),
  matchingController.reject
);
router.get("/:matchId", validateRequest({ params: matchIdParamSchema }), matchingController.getById);
router.patch(
  "/:matchId/start",
  validateRequest({ params: matchIdParamSchema }),
  matchingController.start
);
router.patch(
  "/:matchId/complete",
  validateRequest({ params: matchIdParamSchema }),
  matchingController.complete
);

export const matchingRoutes = router;
