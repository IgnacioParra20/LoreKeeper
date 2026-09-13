import type { Universe, UniverseStatus } from "@lorekeeper/shared";

export interface CreateUniverseData {
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
  findMany(): Promise<Universe[]>;
  findById(id: string): Promise<Universe | null>;
  update(id: string, data: UpdateUniverseData): Promise<Universe>;
  delete(id: string): Promise<void>;
}

