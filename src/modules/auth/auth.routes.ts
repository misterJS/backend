import { Router } from "express";
import { validateRequest } from "../../common/middleware/validateRequest";
import { authController } from "./auth.controller";
import { requestOtpSchema, verifyOtpSchema } from "./auth.validator";

const router = Router();

router.post("/request-otp", validateRequest({ body: requestOtpSchema }), authController.requestOtp);
router.post("/verify-otp", validateRequest({ body: verifyOtpSchema }), authController.verifyOtp);

export const authRoutes = router;
