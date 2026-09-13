import { Router } from "express";

import { asyncHandler } from "../../shared/http/async-handler.js";

export type DatabaseHealthCheck = () => Promise<void>;

export const createHealthRouter = (checkDatabase?: DatabaseHealthCheck): Router => {
  const router = Router();

  router.get(
    "/",
    asyncHandler(async (_request, response) => {
      if (checkDatabase) {
        try {
          await checkDatabase();
          response.json({ status: "ok", database: "up" });
          return;
        } catch {
          response.status(503).json({ status: "degraded", database: "down" });
          return;
        }
      }

      response.json({ status: "ok" });
    }),
  );

  return router;
};

