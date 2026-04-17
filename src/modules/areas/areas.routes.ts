import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../../common/middleware/authMiddleware";
import { validateRequest } from "../../common/middleware/validateRequest";
import { meetPointsController } from "../meet-points/meetPoints.controller";

const router = Router();

const areaOptionsQuerySchema = z.object({
  search: z.string().trim().min(1).optional()
});

const suggestAreaQuerySchema = z.object({
  lat: z.coerce.number().finite(),
  lon: z.coerce.number().finite(),
  limit: z.coerce.number().int().min(1).max(10).optional()
});

const createAreaSchema = z.object({
  label: z.string().trim().min(2).max(160)
});

router.get("/", validateRequest({ query: areaOptionsQuerySchema }), meetPointsController.getAreaOptions);
router.get(
  "/suggest-from-location",
  validateRequest({ query: suggestAreaQuerySchema }),
  meetPointsController.suggestAreaFromLocation
);
router.post(
  "/",
  authMiddleware,
  validateRequest({ body: createAreaSchema }),
  meetPointsController.createArea
);

export const areasRoutes = router;
