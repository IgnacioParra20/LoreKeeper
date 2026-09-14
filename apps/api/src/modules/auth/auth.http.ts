import { createHash } from "node:crypto";
import { parse } from "cookie";
import { Router, type Request, type Response, type RequestHandler } from "express";
import { loginSchema, registerSchema, type Credentials } from "@lorekeeper/validation";
import { validateBody } from "../../middleware/validate-request.js";
import { asyncHandler } from "../../shared/http/async-handler.js";
import { AppError } from "../../shared/errors/app-error.js";
import type { SessionWithUser } from "../users/user.repository.js";
import { type AuthService, publicUser } from "./auth.service.js";

export interface AuthOptions {
  secureCookies: boolean;
  origin: string;
  registerLimit: number;
  loginIpLimit: number;
  loginEmailLimit: number;
}
export const authDefaults: AuthOptions = {
  secureCookies: false, origin: "http://localhost:5173", registerLimit: 5,
  loginIpLimit: 20, loginEmailLimit: 10,
};
export const identity = (response: Response): SessionWithUser => {
  const session = response.locals.session as SessionWithUser | undefined;
  if (!session) throw new AppError(401, "UNAUTHENTICATED", "Inicia sesión para continuar");
  return session;
};

// Bounded store; at capacity reject new keys rather than evicting active limits.
export class AuthLimiter {
  private readonly buckets = new Map<string, { count: number; until: number }>();
  public constructor(private readonly maxKeys = 10_000, private readonly now = Date.now) {}
  public consume(key: string, limit: number, windowMs: number, response: Response): void {
    const now = this.now();
    for (const [storedKey, value] of this.buckets) {
      if (value.until <= now) this.buckets.delete(storedKey);
    }
    const bucket = this.buckets.get(key) ?? { count: 0, until: now + windowMs };
    if (bucket.count >= limit || (!this.buckets.has(key) && this.buckets.size >= this.maxKeys)) {
      response.setHeader("Retry-After", Math.max(1, Math.ceil((bucket.until - now) / 1000)));
      throw new AppError(429, "RATE_LIMITED", "Demasiados intentos. Intenta más tarde");
    }
    bucket.count++;
    this.buckets.set(key, bucket);
  }
}

export const createAuthHttp = (service: AuthService, options: AuthOptions) => {
  const cookieName = options.secureCookies ? "__Host-lorekeeper_session" : "lorekeeper_session";
  const cookieOptions = { httpOnly: true, secure: options.secureCookies, sameSite: "lax" as const, path: "/" };
  const tokenFrom = (request: Request) => parse(request.headers.cookie ?? "")[cookieName];
  const limiter = new AuthLimiter();
  const privateResponse: RequestHandler = (_request, response, next) => {
    response.setHeader("Cache-Control", "no-store");
    next();
  };
  const authenticate = asyncHandler(async (request, response, next) => {
    try { response.locals.session = await service.authenticate(tokenFrom(request)); }
    catch (error) {
      if (error instanceof AppError && error.statusCode === 401) response.clearCookie(cookieName, cookieOptions);
      throw error;
    }
    next();
  });
  const csrf: RequestHandler = (request, response, next) => {
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) service.verifyCsrf(identity(response), request.get("X-CSRF-Token"));
    next();
  };
  const router = Router();
  router.use(privateResponse);
  const limitIp: RequestHandler = (request, response, next) => {
    const registration = request.path === "/register";
    limiter.consume(`${registration ? "register" : "login"}:ip:${request.ip ?? "unknown"}`,
      registration ? options.registerLimit : options.loginIpLimit, registration ? 3600_000 : 900_000, response);
    next();
  };
  for (const path of ["register", "login"] as const) {
    router.post(`/${path}`, limitIp, validateBody(path === "register" ? registerSchema : loginSchema),
      asyncHandler(async (request, response) => {
        const input = request.body as Credentials;
        if (path === "login") limiter.consume(`email:${createHash("sha256").update(input.email).digest("hex")}`,
          options.loginEmailLimit, 900_000, response);
        const result = await service[path](input, tokenFrom(request));
        response.cookie(cookieName, result.token, { ...cookieOptions, maxAge: service.absoluteMs });
        response.status(path === "register" ? 201 : 200).json({ data: result.data });
      }));
  }
  router.get("/me", authenticate, (_request, response) => response.json({ data: publicUser(identity(response).user) }));
  router.get("/csrf", authenticate, asyncHandler(async (_request, response) => {
    response.json({ data: await service.csrf(identity(response)) });
  }));
  router.post("/logout", authenticate, csrf, asyncHandler(async (_request, response) => {
    await service.logout(identity(response));
    response.clearCookie(cookieName, cookieOptions).status(204).send();
  }));
  return { router, authenticate, csrf, privateResponse };
};

export const guardBrowserWrites = (origin: string): RequestHandler => (request, _response, next) => {
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    if (request.get("Origin") !== origin) throw new AppError(403, "REQUEST_ORIGIN_FORBIDDEN", "Origen no permitido");
    if ((request.headers["transfer-encoding"] || Number(request.headers["content-length"] ?? 0) > 0) &&
      !request.is("application/json")) throw new AppError(415, "UNSUPPORTED_MEDIA_TYPE", "Se requiere application/json");
  }
  next();
};
