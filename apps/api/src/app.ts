import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";

import { correlationId } from "./middleware/correlation-id.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFound } from "./middleware/not-found.js";
import {
  createHealthRouter,
  type DatabaseHealthCheck,
} from "./modules/health/health.routes.js";
import { UniverseController } from "./modules/universes/universe.controller.js";
import type { UniverseRepository } from "./modules/universes/universe.repository.js";
import { createUniverseRouter } from "./modules/universes/universe.routes.js";
import { UniverseService } from "./modules/universes/universe.service.js";
import { openApiSpec } from "./openapi/spec.js";
import type { IdentityRepository } from "./modules/users/user.repository.js";
import { AuthService } from "./modules/auth/auth.service.js";
import { authDefaults, createAuthHttp, guardBrowserWrites, type AuthOptions } from "./modules/auth/auth.http.js";
import type { CharacterRepository } from "./modules/characters/character.repository.js";
import { CharacterService } from "./modules/characters/character.service.js";
import { createCharacterRouter } from "./modules/characters/character.routes.js";

interface AppDependencies {
  universeRepository: UniverseRepository;
  identityRepository: IdentityRepository;
  characterRepository: CharacterRepository;
  auth?: Partial<AuthOptions>;
  sessionAbsoluteMs?: number;
  sessionIdleMs?: number;
  checkDatabase?: DatabaseHealthCheck;
  corsOrigin?: string;
}

export const createApp = (dependencies: AppDependencies): Express => {
  const app = express();
  const universeService = new UniverseService(dependencies.universeRepository);
  const universeController = new UniverseController(universeService);
  const authOptions = { ...authDefaults, origin: dependencies.corsOrigin ?? authDefaults.origin, ...dependencies.auth };
  const auth = createAuthHttp(new AuthService(dependencies.identityRepository, dependencies.sessionAbsoluteMs, dependencies.sessionIdleMs), authOptions);

  app.disable("x-powered-by");
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(correlationId);
  app.use(cors({ origin: authOptions.origin, credentials: true }));
  app.use("/api", guardBrowserWrites(authOptions.origin));
  app.use(express.json({ limit: "16kb" }));

  app.use("/health", createHealthRouter(dependencies.checkDatabase));
  app.get("/api/docs.json", (_request, response) => response.json(openApiSpec));
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));
  app.use("/api/auth", auth.router);
  const universeRouter = createUniverseRouter(universeController);
  universeRouter.use("/:universeId/characters", createCharacterRouter(new CharacterService(dependencies.characterRepository)));
  app.use("/api/universes", auth.privateResponse, auth.authenticate, auth.csrf, universeRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
};
