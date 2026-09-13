import type { Universe } from "@lorekeeper/shared";
import type {
  CreateUniverseInput,
  UpdateUniverseInput,
} from "@lorekeeper/validation";

import { AppError } from "../../shared/errors/app-error.js";
import type { UniverseRepository, UpdateUniverseData } from "./universe.repository.js";

export class UniverseService {
  public constructor(private readonly repository: UniverseRepository) {}

  public create(input: CreateUniverseInput): Promise<Universe> {
    return this.repository.create({
      name: input.name,
      description: input.description ?? null,
      status: input.status ?? "ACTIVE",
    });
  }

  public list(): Promise<Universe[]> {
    return this.repository.findMany();
  }

  public async getById(id: string): Promise<Universe> {
    const universe = await this.repository.findById(id);
    if (!universe) {
      throw new AppError(404, "UNIVERSE_NOT_FOUND", "Universe not found");
    }
    return universe;
  }

  public async update(id: string, input: UpdateUniverseInput): Promise<Universe> {
    await this.ensureExists(id);
    const data: UpdateUniverseData = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.description !== undefined) data.description = input.description;
    if (input.status !== undefined) data.status = input.status;
    return this.repository.update(id, data);
  }

  public async delete(id: string): Promise<void> {
    await this.ensureExists(id);
    await this.repository.delete(id);
  }

  private async ensureExists(id: string): Promise<void> {
    if (!(await this.repository.findById(id))) {
      throw new AppError(404, "UNIVERSE_NOT_FOUND", "Universe not found");
    }
  }
}
