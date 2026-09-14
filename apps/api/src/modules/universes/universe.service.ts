import type { Universe } from "@lorekeeper/shared";
import type {
  CreateUniverseInput,
  UpdateUniverseInput,
} from "@lorekeeper/validation";

import { AppError } from "../../shared/errors/app-error.js";
import type { UniverseRepository, UpdateUniverseData } from "./universe.repository.js";

export class UniverseService {
  public constructor(private readonly repository: UniverseRepository) {}

  public create(input: CreateUniverseInput, ownerId: string): Promise<Universe> {
    return this.repository.create({
      ownerId,
      name: input.name,
      description: input.description ?? null,
      status: input.status ?? "ACTIVE",
    });
  }

  public list(ownerId: string): Promise<Universe[]> {
    return this.repository.findMany(ownerId);
  }

  public async getById(id: string, ownerId: string): Promise<Universe> {
    const universe = await this.repository.findById(id, ownerId);
    if (!universe) {
      throw new AppError(404, "UNIVERSE_NOT_FOUND", "Universe not found");
    }
    return universe;
  }

  public async update(id: string, input: UpdateUniverseInput, ownerId: string): Promise<Universe> {
    const data: UpdateUniverseData = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.description !== undefined) data.description = input.description;
    if (input.status !== undefined) data.status = input.status;
    const universe = await this.repository.update(id, ownerId, data);
    if (!universe) throw new AppError(404, "UNIVERSE_NOT_FOUND", "Universe not found");
    return universe;
  }

  public async delete(id: string, ownerId: string): Promise<void> {
    if (!(await this.repository.delete(id, ownerId))) {
      throw new AppError(404, "UNIVERSE_NOT_FOUND", "Universe not found");
    }
  }
}
