import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().min(1, "DATABASE_URL es obligatoria"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error("Configuración inválida", result.error.flatten().fieldErrors);
  throw new Error("No se pudo iniciar la API por variables de entorno inválidas");
}

export const env = result.data;

