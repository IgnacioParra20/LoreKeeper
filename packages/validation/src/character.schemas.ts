import { z } from "zod";

const name = z.string().trim().min(1, "El nombre es obligatorio").max(120, "Máximo 120 caracteres");
const optionalText = (max: number) => z.string().trim().max(max, `Máximo ${max} caracteres`).nullable().optional();

export const createCharacterSchema = z.strictObject({
  name,
  role: optionalText(120),
  description: optionalText(5_000),
});
export const updateCharacterSchema = z.strictObject({
  name: name.optional(),
  role: optionalText(120),
  description: optionalText(5_000),
}).refine((value) => Object.keys(value).length > 0, "Indica al menos un campo");
export const characterCollectionParamsSchema = z.strictObject({
  universeId: z.string().uuid("El universo debe tener un UUID válido"),
});
export const characterIdParamsSchema = characterCollectionParamsSchema.extend({
  characterId: z.string().uuid("El personaje debe tener un UUID válido"),
});

export type CreateCharacterInput = z.infer<typeof createCharacterSchema>;
export type UpdateCharacterInput = z.infer<typeof updateCharacterSchema>;
export type CharacterCollectionParams = z.infer<typeof characterCollectionParamsSchema>;
export type CharacterIdParams = z.infer<typeof characterIdParamsSchema>;
