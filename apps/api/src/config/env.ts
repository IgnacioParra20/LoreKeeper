import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().min(1, "DATABASE_URL es obligatoria"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  COOKIE_SECURE: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
  SESSION_ABSOLUTE_HOURS: z.coerce.number().positive().default(168),
  SESSION_IDLE_HOURS: z.coerce.number().positive().default(24),
  AUTH_REGISTER_LIMIT: z.coerce.number().int().positive().default(5),
  AUTH_LOGIN_IP_LIMIT: z.coerce.number().int().positive().default(20),
  AUTH_LOGIN_EMAIL_LIMIT: z.coerce.number().int().positive().default(10),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error("Configuración inválida", result.error.flatten().fieldErrors);
  throw new Error("No se pudo iniciar la API por variables de entorno inválidas");
}

export const env = result.data;
if (new URL(env.CORS_ORIGIN).origin !== env.CORS_ORIGIN ||
  (new URL(env.CORS_ORIGIN).protocol === "https:" && !env.COOKIE_SECURE) ||
  (!env.COOKIE_SECURE && !["localhost", "127.0.0.1", "[::1]"].includes(new URL(env.CORS_ORIGIN).hostname))) {
  throw new Error("CORS_ORIGIN debe ser un origen exacto; HTTPS requiere COOKIE_SECURE=true. HTTP solo se permite en loopback.");
}
