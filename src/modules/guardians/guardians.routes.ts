import { Router } from "express";
import { authMiddleware } from "../../common/middleware/authMiddleware";
import { validateRequest } from "../../common/middleware/validateRequest";
import { guardiansController } from "./guardians.controller";
import { createGuardianSchema, tripIdParamSchema } from "./guardians.validator";

const router = Router();

router.use(authMiddleware);

router.post("/", validateRequest({ body: createGuardianSchema }), guardiansController.create);
router.get(
  "/:tripId",
  validateRequest({ params: tripIdParamSchema }),
  guardiansController.getByTripId
);

export const guardiansRoutes = router;
