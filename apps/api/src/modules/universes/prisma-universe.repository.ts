import type { Universe } from "@lorekeeper/shared";
import type { PrismaClient, Universe as PrismaUniverse } from "@prisma/client";

import type {
  CreateUniverseData,
  UniverseRepository,
  UpdateUniverseData,
} from "./universe.repository.js";

const toDomain = (universe: PrismaUniverse): Universe => ({
  id: universe.id,
  name: universe.name,
  description: universe.description,
  status: universe.status,
  createdAt: universe.createdAt.toISOString(),
  updatedAt: universe.updatedAt.toISOString(),
});

export class PrismaUniverseRepository implements UniverseRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async create(data: CreateUniverseData): Promise<Universe> {
    return toDomain(await this.prisma.universe.create({ data }));
  }

  public async findMany(): Promise<Universe[]> {
    const universes = await this.prisma.universe.findMany({
      orderBy: { updatedAt: "desc" },
    });
    return universes.map(toDomain);
  }

  public async findById(id: string): Promise<Universe | null> {
    const universe = await this.prisma.universe.findUnique({ where: { id } });
    return universe ? toDomain(universe) : null;
  }

  public async update(id: string, data: UpdateUniverseData): Promise<Universe> {
    return toDomain(await this.prisma.universe.update({ where: { id }, data }));
  }

  public async delete(id: string): Promise<void> {
    await this.prisma.universe.delete({ where: { id } });
  }
}
