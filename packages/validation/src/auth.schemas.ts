import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email("Ingresa un email válido").max(254);
export const passwordSchema = z.string().min(15, "Usa al menos 15 caracteres").max(128, "Usa hasta 128 caracteres");
export const registerSchema = z.strictObject({ email: emailSchema, password: passwordSchema });
export const loginSchema = z.strictObject({ email: emailSchema, password: z.string().min(1).max(128) });
export type Credentials = z.infer<typeof registerSchema>;
