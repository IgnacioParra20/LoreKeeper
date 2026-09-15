import { Prisma, type Character as PrismaCharacter, type PrismaClient } from "@prisma/client";
import type { Character } from "@lorekeeper/shared";
import type { CreateCharacterInput, UpdateCharacterInput } from "@lorekeeper/validation";
import { AppError } from "../../shared/errors/app-error.js";
import type { CharacterRepository } from "./character.repository.js";

const toDomain = (value: PrismaCharacter): Character => ({
  id: value.id, universeId: value.universeId, name: value.name,
  role: value.role, description: value.description,
  createdAt: value.createdAt.toISOString(), updatedAt: value.updatedAt.toISOString(),
});
const owned = (universeId: string, ownerId: string) => ({ id: universeId, ownerId });
const characterWhere = (universeId: string, characterId: string, ownerId: string) => ({
  id: characterId, universeId, universe: { ownerId },
});

export class PrismaCharacterRepository implements CharacterRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async list(universeId: string, ownerId: string) {
    if (!await this.prisma.universe.findFirst({ where: owned(universeId, ownerId), select: { id: true } })) return null;
    return (await this.prisma.character.findMany({ where: { universeId }, orderBy: [{ updatedAt: "desc" }, { id: "asc" }] })).map(toDomain);
  }
  public async create(universeId: string, ownerId: string, input: CreateCharacterInput) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        if (!await tx.universe.findFirst({ where: owned(universeId, ownerId), select: { id: true } })) return null;
        return toDomain(await tx.character.create({ data: {
          universeId, name: input.name, role: input.role ?? null, description: input.description ?? null,
        } }));
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
        throw new AppError(404, "UNIVERSE_NOT_FOUND", "Universe not found");
      }
      throw error;
    }
  }
  public async getById(universeId: string, characterId: string, ownerId: string) {
    const value = await this.prisma.character.findFirst({ where: characterWhere(universeId, characterId, ownerId) });
    return value ? toDomain(value) : null;
  }
  public async update(universeId: string, characterId: string, ownerId: string, input: UpdateCharacterInput) {
    return this.prisma.$transaction(async (tx) => {
      const data: Prisma.CharacterUpdateManyMutationInput = {};
      if (input.name !== undefined) data.name = input.name;
      if (input.role !== undefined) data.role = input.role;
      if (input.description !== undefined) data.description = input.description;
      const result = await tx.character.updateMany({ where: characterWhere(universeId, characterId, ownerId), data });
      if (result.count === 0) return null;
      const value = await tx.character.findFirst({ where: characterWhere(universeId, characterId, ownerId) });
      return value ? toDomain(value) : null;
    });
  }
  public async delete(universeId: string, characterId: string, ownerId: string) {
    return (await this.prisma.character.deleteMany({ where: characterWhere(universeId, characterId, ownerId) })).count > 0;
  }
}
