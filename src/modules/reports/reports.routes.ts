import { Router } from "express";
import { authMiddleware } from "../../common/middleware/authMiddleware";
import { validateRequest } from "../../common/middleware/validateRequest";
import { reportsController } from "./reports.controller";
import { createReportSchema } from "./reports.validator";

const router = Router();

router.use(authMiddleware);

router.post("/", validateRequest({ body: createReportSchema }), reportsController.create);

export const reportsRoutes = router;
