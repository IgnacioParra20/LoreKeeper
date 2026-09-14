import { randomUUID } from "node:crypto";

import type { Universe } from "@lorekeeper/shared";

import type {
  CreateUniverseData,
  UniverseRepository,
  UpdateUniverseData,
} from "../modules/universes/universe.repository.js";

export class InMemoryUniverseRepository implements UniverseRepository {
  private readonly universes = new Map<string, Universe>();
  private readonly owners = new Map<string, string>();

  public async create(data: CreateUniverseData): Promise<Universe> {
    const now = new Date().toISOString();
    const universe: Universe = {
      id: randomUUID(),
      name: data.name, description: data.description, status: data.status,
      createdAt: now,
      updatedAt: now,
    };
    this.universes.set(universe.id, universe);
    this.owners.set(universe.id, data.ownerId);
    return Promise.resolve(universe);
  }

  public async findMany(ownerId: string): Promise<Universe[]> {
    return Promise.resolve(
      [...this.universes.values()].filter((value) => this.owners.get(value.id) === ownerId).sort((left, right) =>
        right.updatedAt.localeCompare(left.updatedAt),
      ),
    );
  }

  public findById(id: string, ownerId: string): Promise<Universe | null> {
    return Promise.resolve(this.owners.get(id) === ownerId ? this.universes.get(id) ?? null : null);
  }

  public async update(id: string, ownerId: string, data: UpdateUniverseData): Promise<Universe | null> {
    const current = await this.findById(id, ownerId);
    if (!current) {
      return null;
    }
    const updated = { ...current, ...data, updatedAt: new Date().toISOString() };
    this.universes.set(id, updated);
    return Promise.resolve(updated);
  }

  public delete(id: string, ownerId: string): Promise<boolean> {
    if (this.owners.get(id) !== ownerId) return Promise.resolve(false);
    this.universes.delete(id);
    this.owners.delete(id);
    return Promise.resolve(true);
  }
}
