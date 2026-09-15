import type { Universe } from "@lorekeeper/shared";
import { Prisma, type PrismaClient, type Universe as PrismaUniverse } from "@prisma/client";
import { AppError } from "../../shared/errors/app-error.js";

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

  public async findMany(ownerId: string): Promise<Universe[]> {
    const universes = await this.prisma.universe.findMany({
      where: { ownerId },
      orderBy: { updatedAt: "desc" },
    });
    return universes.map(toDomain);
  }

  public async findById(id: string, ownerId: string): Promise<Universe | null> {
    const universe = await this.prisma.universe.findUnique({ where: { id, ownerId } });
    return universe ? toDomain(universe) : null;
  }

  public async update(id: string, ownerId: string, data: UpdateUniverseData): Promise<Universe | null> {
    return this.prisma.$transaction(async (transaction) => {
      const result = await transaction.universe.updateMany({ where: { id, ownerId }, data });
      if (result.count === 0) return null;
      const universe = await transaction.universe.findUnique({ where: { id, ownerId } });
      return universe ? toDomain(universe) : null;
    });
  }

  public async delete(id: string, ownerId: string): Promise<boolean> {
    try {
      const removed = await this.prisma.universe.deleteMany({ where: { id, ownerId, characters: { none: {} } } });
      if (removed.count > 0) return true;
      if (await this.prisma.universe.findFirst({ where: { id, ownerId }, select: { id: true } })) {
        throw new AppError(409, "UNIVERSE_HAS_CHARACTERS", "Elimina sus personajes antes de borrar el universo");
      }
      return false;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
        throw new AppError(409, "UNIVERSE_HAS_CHARACTERS", "Elimina sus personajes antes de borrar el universo");
      }
      throw error;
    }
  }
}
