import { Router } from "express";
import { z } from "zod";
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

router.get("/", meetPointsController.getAll);
router.get("/areas", validateRequest({ query: areaOptionsQuerySchema }), meetPointsController.getAreaOptions);
router.get(
  "/recommendations",
  validateRequest({ query: recommendationsQuerySchema }),
  meetPointsController.getRecommendations
);
router.get(
  "/trip-leader-recommendations",
  validateRequest({ query: routeRecommendationsQuerySchema }),
  meetPointsController.getTripLeaderRouteRecommendations
);

export const meetPointsRoutes = router;
