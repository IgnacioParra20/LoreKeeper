import { PrismaClient } from "@prisma/client";

import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { PrismaUniverseRepository } from "./modules/universes/prisma-universe.repository.js";

const prisma = new PrismaClient();

const app = createApp({
  universeRepository: new PrismaUniverseRepository(prisma),
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

