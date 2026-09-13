import type { RequestHandler } from "express";
import type { ZodType } from "zod";

export const validateBody = (schema: ZodType): RequestHandler =>
  (request, _response, next) => {
    const result = schema.safeParse(request.body);
    if (!result.success) {
      next(result.error);
      return;
    }

    request.body = result.data;
    next();
  };

export const validateParams = (schema: ZodType): RequestHandler =>
  (request, response, next) => {
    const result = schema.safeParse(request.params);
    if (!result.success) {
      next(result.error);
      return;
    }

    response.locals.validatedParams = result.data;
    next();
  };

