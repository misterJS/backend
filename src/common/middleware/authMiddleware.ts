import { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/appError";
import { verifyAccessToken } from "../utils/jwt";

export const authMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    throw new AppError("Unauthorized", 401);
  }

  const token = authorization.replace("Bearer ", "");
  const payload = verifyAccessToken(token);

  req.currentUser = payload;
  next();
};
