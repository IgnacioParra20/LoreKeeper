import { randomUUID } from "node:crypto";

import type { RequestHandler } from "express";

export const correlationId: RequestHandler = (request, response, next) => {
  const incoming = request.header("x-correlation-id");
  const id = incoming && incoming.length <= 128 ? incoming : randomUUID();

  response.locals.correlationId = id;
  response.setHeader("x-correlation-id", id);
  next();
};

