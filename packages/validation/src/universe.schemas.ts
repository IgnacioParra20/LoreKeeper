import { UNIVERSE_STATUSES } from "@lorekeeper/shared";
import { z } from "zod";

const universeNameSchema = z
  .string()
  .trim()
  .min(1, "El nombre es obligatorio")
  .max(120, "El nombre no puede superar los 120 caracteres");

const universeDescriptionSchema = z
  .string()
  .trim()
  .max(5_000, "La descripción no puede superar los 5000 caracteres")
  .nullable()
  .optional();

export const createUniverseSchema = z.strictObject({
  name: universeNameSchema,
  description: universeDescriptionSchema,
  status: z.enum(UNIVERSE_STATUSES).optional(),
});

export const updateUniverseSchema = z
  .strictObject({
    name: universeNameSchema.optional(),
    description: universeDescriptionSchema,
    status: z.enum(UNIVERSE_STATUSES).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Debes indicar al menos un campo para actualizar",
  });

export const universeIdParamsSchema = z.strictObject({
  id: z.string().uuid("El identificador debe ser un UUID válido"),
});

export type CreateUniverseInput = z.infer<typeof createUniverseSchema>;
export type UpdateUniverseInput = z.infer<typeof updateUniverseSchema>;
export type UniverseIdParams = z.infer<typeof universeIdParamsSchema>;

