import { Router } from "express";
import { authMiddleware } from "../../common/middleware/authMiddleware";
import { validateRequest } from "../../common/middleware/validateRequest";
import { authController } from "./auth.controller";
import { logoutSchema, requestOtpSchema, verifyOtpSchema } from "./auth.validator";

const router = Router();

router.post("/request-otp", validateRequest({ body: requestOtpSchema }), authController.requestOtp);
router.post("/verify-otp", validateRequest({ body: verifyOtpSchema }), authController.verifyOtp);
router.post(
  "/logout",
  authMiddleware,
  validateRequest({ body: logoutSchema }),
  authController.logout
);

export const authRoutes = router;
