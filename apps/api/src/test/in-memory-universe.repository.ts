import { randomUUID } from "node:crypto";

import type { Universe } from "@lorekeeper/shared";

import type {
  CreateUniverseData,
  UniverseRepository,
  UpdateUniverseData,
} from "../modules/universes/universe.repository.js";

export class InMemoryUniverseRepository implements UniverseRepository {
  private readonly universes = new Map<string, Universe>();

  public async create(data: CreateUniverseData): Promise<Universe> {
    const now = new Date().toISOString();
    const universe: Universe = {
      id: randomUUID(),
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    this.universes.set(universe.id, universe);
    return Promise.resolve(universe);
  }

  public async findMany(): Promise<Universe[]> {
    return Promise.resolve(
      [...this.universes.values()].sort((left, right) =>
        right.updatedAt.localeCompare(left.updatedAt),
      ),
    );
  }

  public findById(id: string): Promise<Universe | null> {
    return Promise.resolve(this.universes.get(id) ?? null);
  }

  public async update(id: string, data: UpdateUniverseData): Promise<Universe> {
    const current = this.universes.get(id);
    if (!current) {
      throw new Error("Repository invariant violated");
    }
    const updated = { ...current, ...data, updatedAt: new Date().toISOString() };
    this.universes.set(id, updated);
    return Promise.resolve(updated);
  }

  public delete(id: string): Promise<void> {
    this.universes.delete(id);
    return Promise.resolve();
  }
}

