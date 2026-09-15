import { PrismaClient } from "@prisma/client";

import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { PrismaUniverseRepository } from "./modules/universes/prisma-universe.repository.js";
import { PrismaIdentityRepository } from "./modules/users/prisma-identity.repository.js";
import { PrismaCharacterRepository } from "./modules/characters/prisma-character.repository.js";

const prisma = new PrismaClient();

const app = createApp({
  universeRepository: new PrismaUniverseRepository(prisma),
  identityRepository: new PrismaIdentityRepository(prisma),
  characterRepository: new PrismaCharacterRepository(prisma),
  auth: { secureCookies: env.COOKIE_SECURE, registerLimit: env.AUTH_REGISTER_LIMIT, loginIpLimit: env.AUTH_LOGIN_IP_LIMIT, loginEmailLimit: env.AUTH_LOGIN_EMAIL_LIMIT },
  sessionAbsoluteMs: env.SESSION_ABSOLUTE_HOURS * 3600_000,
  sessionIdleMs: env.SESSION_IDLE_HOURS * 3600_000,
  checkDatabase: async () => {
    await prisma.$queryRaw`SELECT 1`;
  },
  corsOrigin: env.CORS_ORIGIN,
});

const server = app.listen(env.PORT, () => {
  console.log(`LoreKeeper API disponible en http://localhost:${env.PORT}`);
  console.log(`Swagger disponible en http://localhost:${env.PORT}/api/docs`);
});

const shutdown = (signal: string): void => {
  console.log(`${signal} recibido; cerrando LoreKeeper API`);
  server.close(() => {
    void prisma.$disconnect().finally(() => process.exit(0));
  });
};

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));
