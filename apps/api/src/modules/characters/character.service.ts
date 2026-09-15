import type { CreateCharacterInput, UpdateCharacterInput } from "@lorekeeper/validation";
import { AppError } from "../../shared/errors/app-error.js";
import type { CharacterRepository } from "./character.repository.js";

const universeNotFound = () => new AppError(404, "UNIVERSE_NOT_FOUND", "Universe not found");
const characterNotFound = () => new AppError(404, "CHARACTER_NOT_FOUND", "Character not found");

export class CharacterService {
  public constructor(private readonly repository: CharacterRepository) {}
  public async list(universeId: string, ownerId: string) {
    const values = await this.repository.list(universeId, ownerId);
    if (values === null) throw universeNotFound();
    return values;
  }
  public async create(universeId: string, ownerId: string, input: CreateCharacterInput) {
    const value = await this.repository.create(universeId, ownerId, input);
    if (!value) throw universeNotFound();
    return value;
  }
  public async getById(universeId: string, characterId: string, ownerId: string) {
    const value = await this.repository.getById(universeId, characterId, ownerId);
    if (!value) throw characterNotFound();
    return value;
  }
  public async update(universeId: string, characterId: string, ownerId: string, input: UpdateCharacterInput) {
    const value = await this.repository.update(universeId, characterId, ownerId, input);
    if (!value) throw characterNotFound();
    return value;
  }
  public async delete(universeId: string, characterId: string, ownerId: string) {
    if (!await this.repository.delete(universeId, characterId, ownerId)) throw characterNotFound();
  }
}
