import { randomUUID } from "node:crypto";
import type { Character } from "@lorekeeper/shared";
import type { CreateCharacterInput, UpdateCharacterInput } from "@lorekeeper/validation";
import type { CharacterRepository } from "../modules/characters/character.repository.js";
import type { InMemoryUniverseRepository } from "./in-memory-universe.repository.js";

export class InMemoryCharacterRepository implements CharacterRepository {
  private readonly characters = new Map<string, Character>();
  public constructor(private readonly universes: InMemoryUniverseRepository) {
    universes.setHasCharacters((id) => [...this.characters.values()].some((value) => value.universeId === id));
  }
  private owns(universeId: string, ownerId: string) { return this.universes.findById(universeId, ownerId); }
  public async list(universeId: string, ownerId: string) {
    if (!await this.owns(universeId, ownerId)) return null;
    return [...this.characters.values()].filter((value) => value.universeId === universeId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  public async create(universeId: string, ownerId: string, input: CreateCharacterInput) {
    if (!await this.owns(universeId, ownerId)) return null;
    const now = new Date().toISOString();
    const value: Character = { id: randomUUID(), universeId, name: input.name,
      role: input.role ?? null, description: input.description ?? null, createdAt: now, updatedAt: now };
    this.characters.set(value.id, value);
    return value;
  }
  public async getById(universeId: string, characterId: string, ownerId: string) {
    if (!await this.owns(universeId, ownerId)) return null;
    const value = this.characters.get(characterId);
    return value?.universeId === universeId ? value : null;
  }
  public async update(universeId: string, characterId: string, ownerId: string, input: UpdateCharacterInput) {
    const value = await this.getById(universeId, characterId, ownerId);
    if (!value) return null;
    const updated: Character = { ...value,
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.role !== undefined ? { role: input.role } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      updatedAt: new Date().toISOString() };
    this.characters.set(characterId, updated);
    return updated;
  }
  public async delete(universeId: string, characterId: string, ownerId: string) {
    if (!await this.getById(universeId, characterId, ownerId)) return false;
    return this.characters.delete(characterId);
  }
}
