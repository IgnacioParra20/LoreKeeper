export {
  createUniverseSchema,
  universeIdParamsSchema,
  updateUniverseSchema,
  type CreateUniverseInput,
  type UniverseIdParams,
  type UpdateUniverseInput,
} from "./universe.schemas.js";
export { emailSchema, passwordSchema, registerSchema, loginSchema, type Credentials } from "./auth.schemas.js";
export { createCharacterSchema, updateCharacterSchema, characterCollectionParamsSchema, characterIdParamsSchema,
  type CreateCharacterInput, type UpdateCharacterInput, type CharacterCollectionParams, type CharacterIdParams } from "./character.schemas.js";
