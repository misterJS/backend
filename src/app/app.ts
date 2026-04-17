import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
import { authMiddleware } from "../common/middleware/authMiddleware";
import { authRoutes } from "../modules/auth/auth.routes";
import { usersRoutes } from "../modules/users/users.routes";
import { usersController } from "../modules/users/users.controller";
import { tripsRoutes } from "../modules/trips/trips.routes";
import { matchingRoutes } from "../modules/matching/matching.routes";
import { meetPointsRoutes } from "../modules/meet-points/meetPoints.routes";
import { areasRoutes } from "../modules/areas/areas.routes";
import { guardiansRoutes } from "../modules/guardians/guardians.routes";
import { reportsRoutes } from "../modules/reports/reports.routes";
import { ratingsRoutes } from "../modules/ratings/ratings.routes";
import { globalErrorHandler } from "../common/middleware/globalErrorHandler";
import { notFoundHandler } from "../common/middleware/notFoundHandler";
import { successResponse } from "../common/utils/apiResponse";
import { env } from "../config/env";

export const app = express();
app.disable("etag");

const resolveTrustProxy = (value: string | boolean | undefined) => {
  if (typeof value === "boolean") {
    return value ? 1 : false;
  }

  if (!value) {
    return false;
  }

  const normalized = value.trim().toLowerCase();

  if (["true", "yes"].includes(normalized)) {
    return 1;
  }

  if (normalized === "1") {
    return 1;
  }

  if (["false", "0", "no"].includes(normalized)) {
    return false;
  }

  const hopCount = Number(normalized);
  if (Number.isInteger(hopCount) && hopCount >= 0) {
    return hopCount;
  }

  return value;
};

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false
});

app.set("trust proxy", resolveTrustProxy(env.TRUST_PROXY));
app.use(cors());
app.use(helmet());
app.use(morgan("dev"));
app.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});
app.use(limiter);
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json(successResponse("Barengin backend is running", { status: "ok" }));
});

app.get("/me/trip-leader-status", authMiddleware, usersController.getMyTripLeaderStatus);
app.use("/auth", authRoutes);
app.use("/users", usersRoutes);
app.use("/trips", tripsRoutes);
app.use("/matching", matchingRoutes);
app.use("/meet-points", meetPointsRoutes);
app.use("/areas", areasRoutes);
app.use("/guardians", guardiansRoutes);
app.use("/reports", reportsRoutes);
app.use("/ratings", ratingsRoutes);

app.use(notFoundHandler);
app.use(globalErrorHandler);
