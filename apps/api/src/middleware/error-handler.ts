import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

import type { ApiErrorResponse, ApiFieldError } from "@lorekeeper/shared";

import { AppError } from "../shared/errors/app-error.js";

export const errorHandler = (
  error: unknown,
  _request: Request,
  response: Response<ApiErrorResponse>,
  _next: NextFunction,
): void => {
  const correlationId = String(response.locals.correlationId ?? "unknown");

  if (error instanceof ZodError) {
    const details: ApiFieldError[] = error.issues.map((issue) => ({
      field: issue.path.join(".") || "request",
      message: issue.message,
    }));

    response.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Los datos enviados no son válidos",
        correlationId,
        details,
      },
    });
    return;
  }

  if (error instanceof AppError) {
    const details = Array.isArray(error.details)
      ? (error.details as ApiFieldError[])
      : undefined;
    response.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        correlationId,
        ...(details ? { details } : {}),
      },
    });
    return;
  }

  if (process.env.NODE_ENV !== "test") {
    console.error(`[${correlationId}] Error inesperado`, error);
  }

  response.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Ocurrió un error inesperado",
      correlationId,
    },
  });
};

