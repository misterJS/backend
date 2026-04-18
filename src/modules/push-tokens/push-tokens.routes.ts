import { Router } from "express";
import { authMiddleware } from "../../common/middleware/authMiddleware";
import { validateRequest } from "../../common/middleware/validateRequest";
import { pushTokensController } from "./push-tokens.controller";
import {
  deactivatePushTokenParamsSchema,
  registerPushTokenSchema
} from "./push-tokens.validator";

const router = Router();

router.use(authMiddleware);

router.post("/", validateRequest({ body: registerPushTokenSchema }), pushTokensController.register);
router.delete(
  "/:token",
  validateRequest({ params: deactivatePushTokenParamsSchema }),
  pushTokensController.deactivate
);

export const pushTokensRoutes = router;
