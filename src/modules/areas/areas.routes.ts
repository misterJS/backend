import { Router } from "express";
import { z } from "zod";
import { AreaLevel } from "@prisma/client";
import { authMiddleware } from "../../common/middleware/authMiddleware";
import { validateRequest } from "../../common/middleware/validateRequest";
import { meetPointsController } from "../meet-points/meetPoints.controller";

const router = Router();

const areaOptionsQuerySchema = z.object({
  search: z.string().trim().min(1).optional()
});

const suggestAreaQuerySchema = z.object({
  lat: z.coerce.number().finite().min(-90).max(90),
  lon: z.coerce.number().finite().min(-180).max(180),
  limit: z.coerce.number().int().min(1).max(20).optional()
});

const createAreaSchema = z.object({
  label: z.string().trim().min(2).max(160),
  description: z.string().trim().min(2).max(200).optional(),
  level: z.nativeEnum(AreaLevel).optional(),
  latitude: z.number().finite().min(-90).max(90).optional(),
  longitude: z.number().finite().min(-180).max(180).optional(),
  provinceCode: z.string().trim().min(1).max(40).optional(),
  cityCode: z.string().trim().min(1).max(40).optional(),
  districtCode: z.string().trim().min(1).max(40).optional(),
  villageCode: z.string().trim().min(1).max(40).optional(),
  adminCode: z.string().trim().min(1).max(40).optional(),
  source: z.enum(["DEVICE_LOCATION", "USER_INPUT"]).optional()
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
