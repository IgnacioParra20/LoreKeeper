import type { RequestHandler } from "express";

export const notFound: RequestHandler = (_request, response) => {
  response.status(404).json({
    error: {
      code: "ROUTE_NOT_FOUND",
      message: "La ruta solicitada no existe",
      correlationId: String(response.locals.correlationId ?? "unknown"),
    },
  });
};

