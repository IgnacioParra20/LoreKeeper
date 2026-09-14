import type { Universe, UniverseStatus } from "@lorekeeper/shared";

export interface CreateUniverseData {
  ownerId: string;
  name: string;
  description: string | null;
  status: UniverseStatus;
}

export interface UpdateUniverseData {
  name?: string;
  description?: string | null;
  status?: UniverseStatus;
}

export interface UniverseRepository {
  create(data: CreateUniverseData): Promise<Universe>;
  findMany(ownerId: string): Promise<Universe[]>;
  findById(id: string, ownerId: string): Promise<Universe | null>;
  update(id: string, ownerId: string, data: UpdateUniverseData): Promise<Universe | null>;
  delete(id: string, ownerId: string): Promise<boolean>;
}
