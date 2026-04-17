import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../../common/middleware/authMiddleware";
import { validateRequest } from "../../common/middleware/validateRequest";
import { meetPointsController } from "./meetPoints.controller";

const router = Router();

const recommendationsQuerySchema = z.object({
  area: z.string().trim().min(1).optional()
});

const routeRecommendationsQuerySchema = z.object({
  startArea: z.string().trim().min(1),
  destinationArea: z.string().trim().min(1),
  departureTime: z.string().datetime().optional()
});

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

const createMeetPointSchema = z.object({
  name: z.string().trim().min(2).max(120),
  type: z.string().trim().min(2).max(80).optional(),
  address: z.string().trim().min(4).max(200),
  area: z.string().trim().min(2).max(160),
  latitude: z.number().finite().optional(),
  longitude: z.number().finite().optional()
});

router.get("/", meetPointsController.getAll);
router.get("/areas", validateRequest({ query: areaOptionsQuerySchema }), meetPointsController.getAreaOptions);
router.get(
  "/areas/suggest-from-location",
  validateRequest({ query: suggestAreaQuerySchema }),
  meetPointsController.suggestAreaFromLocation
);
router.post(
  "/areas",
  authMiddleware,
  validateRequest({ body: createAreaSchema }),
  meetPointsController.createArea
);
router.get(
  "/recommendations",
  validateRequest({ query: recommendationsQuerySchema }),
  meetPointsController.getRecommendations
);
router.post(
  "/",
  authMiddleware,
  validateRequest({ body: createMeetPointSchema }),
  meetPointsController.createMeetPoint
);
router.get(
  "/trip-leader-recommendations",
  validateRequest({ query: routeRecommendationsQuerySchema }),
  meetPointsController.getTripLeaderRouteRecommendations
);

export const meetPointsRoutes = router;
