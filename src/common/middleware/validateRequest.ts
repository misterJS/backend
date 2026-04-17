import { NextFunction, Request, RequestHandler, Response } from "express";
import { ZodSchema } from "zod";
import { AppError } from "../errors/appError";

type RequestSchemas = {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
};

export const validateRequest = (schemas: RequestSchemas): RequestHandler => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsedBody = schemas.body ? schemas.body.safeParse(req.body) : null;
    if (parsedBody && !parsedBody.success) {
      return next(new AppError("Validation error", 400, parsedBody.error.flatten()));
    }

    const parsedParams = schemas.params ? schemas.params.safeParse(req.params) : null;
    if (parsedParams && !parsedParams.success) {
      return next(new AppError("Validation error", 400, parsedParams.error.flatten()));
    }

    const parsedQuery = schemas.query ? schemas.query.safeParse(req.query) : null;
    if (parsedQuery && !parsedQuery.success) {
      return next(new AppError("Validation error", 400, parsedQuery.error.flatten()));
    }

    if (parsedBody) {
      req.body = parsedBody.data;
    }

    if (parsedParams) {
      req.params = parsedParams.data as Request["params"];
    }

    if (parsedQuery) {
      req.query = parsedQuery.data as Request["query"];
    }

    return next();
  };
};
