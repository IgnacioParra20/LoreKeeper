import { Router } from "express";
import type { Response } from "express";
import type { CharacterCollectionParams, CharacterIdParams, CreateCharacterInput, UpdateCharacterInput } from "@lorekeeper/validation";
import { characterCollectionParamsSchema, characterIdParamsSchema, createCharacterSchema, updateCharacterSchema } from "@lorekeeper/validation";
import { validateBody, validateParams } from "../../middleware/validate-request.js";
import { asyncHandler } from "../../shared/http/async-handler.js";
import { identity } from "../auth/auth.http.js";
import type { CharacterService } from "./character.service.js";

const params = (response: Response) => response.locals.validatedParams as CharacterCollectionParams;
const itemParams = (response: Response) => response.locals.validatedParams as CharacterIdParams;

export const createCharacterRouter = (service: CharacterService) => {
  const router = Router({ mergeParams: true });
  router.get("/", validateParams(characterCollectionParamsSchema), asyncHandler(async (_request, response) => {
    response.json({ data: await service.list(params(response).universeId, identity(response).userId) });
  }));
  router.post("/", validateParams(characterCollectionParamsSchema), validateBody(createCharacterSchema), asyncHandler(async (request, response) => {
    response.status(201).json({ data: await service.create(params(response).universeId, identity(response).userId, request.body as CreateCharacterInput) });
  }));
  router.get("/:characterId", validateParams(characterIdParamsSchema), asyncHandler(async (_request, response) => {
    const { universeId, characterId } = itemParams(response);
    response.json({ data: await service.getById(universeId, characterId, identity(response).userId) });
  }));
  router.patch("/:characterId", validateParams(characterIdParamsSchema), validateBody(updateCharacterSchema), asyncHandler(async (request, response) => {
    const { universeId, characterId } = itemParams(response);
    response.json({ data: await service.update(universeId, characterId, identity(response).userId, request.body as UpdateCharacterInput) });
  }));
  router.delete("/:characterId", validateParams(characterIdParamsSchema), asyncHandler(async (_request, response) => {
    const { universeId, characterId } = itemParams(response);
    await service.delete(universeId, characterId, identity(response).userId);
    response.status(204).send();
  }));
  return router;
};
