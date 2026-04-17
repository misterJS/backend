import { Router } from "express";
import { authMiddleware } from "../../common/middleware/authMiddleware";
import { validateRequest } from "../../common/middleware/validateRequest";
import { ratingsController } from "./ratings.controller";
import { createRatingSchema } from "./ratings.validator";

const router = Router();

router.use(authMiddleware);

router.post("/", validateRequest({ body: createRatingSchema }), ratingsController.create);

export const ratingsRoutes = router;
