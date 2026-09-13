import { Router } from "express";

import {
  createUniverseSchema,
  universeIdParamsSchema,
  updateUniverseSchema,
} from "@lorekeeper/validation";

import { validateBody, validateParams } from "../../middleware/validate-request.js";
import { asyncHandler } from "../../shared/http/async-handler.js";
import type { UniverseController } from "./universe.controller.js";

export const createUniverseRouter = (controller: UniverseController): Router => {
  const router = Router();

  router.post("/", validateBody(createUniverseSchema), asyncHandler(controller.create));
  router.get("/", asyncHandler(controller.list));
  router.get(
    "/:id",
    validateParams(universeIdParamsSchema),
    asyncHandler(controller.getById),
  );
  router.patch(
    "/:id",
    validateParams(universeIdParamsSchema),
    validateBody(updateUniverseSchema),
    asyncHandler(controller.update),
  );
  router.delete(
    "/:id",
    validateParams(universeIdParamsSchema),
    asyncHandler(controller.remove),
  );

  return router;
};

