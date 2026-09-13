import type { Request, Response } from "express";

import type { ApiSuccess, Universe } from "@lorekeeper/shared";
import type {
  CreateUniverseInput,
  UniverseIdParams,
  UpdateUniverseInput,
} from "@lorekeeper/validation";

import type { UniverseService } from "./universe.service.js";

const getValidatedParams = (response: Response): UniverseIdParams =>
  response.locals.validatedParams as UniverseIdParams;

export class UniverseController {
  public constructor(private readonly service: UniverseService) {}

  public create = async (
    request: Request,
    response: Response<ApiSuccess<Universe>>,
  ): Promise<void> => {
    const universe = await this.service.create(request.body as CreateUniverseInput);
    response.status(201).json({ data: universe });
  };

  public list = async (
    _request: Request,
    response: Response<ApiSuccess<Universe[]>>,
  ): Promise<void> => {
    response.json({ data: await this.service.list() });
  };

  public getById = async (
    _request: Request,
    response: Response<ApiSuccess<Universe>>,
  ): Promise<void> => {
    const universe = await this.service.getById(getValidatedParams(response).id);
    response.json({ data: universe });
  };

  public update = async (
    request: Request,
    response: Response<ApiSuccess<Universe>>,
  ): Promise<void> => {
    const universe = await this.service.update(
      getValidatedParams(response).id,
      request.body as UpdateUniverseInput,
    );
    response.json({ data: universe });
  };

  public remove = async (_request: Request, response: Response): Promise<void> => {
    await this.service.delete(getValidatedParams(response).id);
    response.status(204).send();
  };
}

