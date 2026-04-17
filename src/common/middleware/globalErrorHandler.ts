import { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { AppError } from "../errors/appError";
import { errorResponse } from "../utils/apiResponse";

export const globalErrorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (error instanceof AppError) {
    res.status(error.statusCode).json(errorResponse(error.message, error.errors));
    return;
  }

  if (error instanceof PrismaClientKnownRequestError) {
    res.status(400).json(errorResponse("Database error", {
      code: error.code,
      meta: error.meta
    }));
    return;
  }

  if (error instanceof Error) {
    res.status(500).json(errorResponse(error.message));
    return;
  }

  res.status(500).json(errorResponse("Internal server error"));
};
