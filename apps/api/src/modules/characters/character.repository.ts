import type { Character } from "@lorekeeper/shared";
import type { CreateCharacterInput, UpdateCharacterInput } from "@lorekeeper/validation";

export interface CharacterRepository {
  list(universeId: string, ownerId: string): Promise<Character[] | null>;
  create(universeId: string, ownerId: string, input: CreateCharacterInput): Promise<Character | null>;
  getById(universeId: string, characterId: string, ownerId: string): Promise<Character | null>;
  update(universeId: string, characterId: string, ownerId: string, input: UpdateCharacterInput): Promise<Character | null>;
  delete(universeId: string, characterId: string, ownerId: string): Promise<boolean>;
}
