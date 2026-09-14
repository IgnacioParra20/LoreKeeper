import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { User } from "@prisma/client";
import type { PublicUser } from "@lorekeeper/shared";
import type { Credentials } from "@lorekeeper/validation";
import { AppError } from "../../shared/errors/app-error.js";
import type { IdentityRepository, SessionWithUser } from "../users/user.repository.js";
import { getDummyHash, hashPassword, verifyPassword } from "./password.js";

export const digest = (token: string) => createHash("sha256").update(token).digest("hex");
const newToken = () => randomBytes(32).toString("base64url");
export const publicUser = (user: User): PublicUser => ({
  id: user.id, email: user.email, status: user.status,
  createdAt: user.createdAt.toISOString(), updatedAt: user.updatedAt.toISOString(),
});
const unauthenticated = () => new AppError(401, "UNAUTHENTICATED", "Inicia sesión para continuar");

export class AuthService {
  public constructor(
    private readonly repository: IdentityRepository,
    public readonly absoluteMs = 7 * 86400_000,
    private readonly idleMs = 86400_000,
    private readonly now: () => Date = () => new Date(),
  ) {}
  public async register(input: Credentials, previousToken?: string) {
    const user = await this.repository.createUser(input.email, await hashPassword(input.password));
    return this.issue(user, previousToken);
  }
  public async login(input: Credentials, previousToken?: string) {
    const user = await this.repository.findUser(input.email);
    const valid = await verifyPassword(user?.passwordHash ?? await getDummyHash(), input.password);
    if (!user || !valid || user.status !== "ACTIVE") {
      throw new AppError(401, "INVALID_CREDENTIALS", "Email o contraseña incorrectos");
    }
    return this.issue(user, previousToken);
  }
  private async issue(user: User, previousToken?: string) {
    const token = newToken();
    const csrfToken = newToken();
    if (previousToken) await this.repository.deleteSession(digest(previousToken));
    await this.repository.createSession({
      userId: user.id, tokenHash: digest(token), csrfTokenHash: digest(csrfToken),
      expiresAt: new Date(this.now().getTime() + this.absoluteMs),
    });
    return { token, data: { user: publicUser(user), csrfToken } };
  }
  public async authenticate(token?: string): Promise<SessionWithUser> {
    if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) throw unauthenticated();
    const session = await this.repository.findSession(digest(token));
    const now = this.now();
    if (!session || session.user.status !== "ACTIVE" || session.expiresAt <= now ||
      now.getTime() - session.lastSeenAt.getTime() >= this.idleMs) {
      if (session) await this.repository.deleteSession(session.tokenHash);
      throw unauthenticated();
    }
    if (now.getTime() - session.lastSeenAt.getTime() >= 300_000) {
      await this.repository.touchSession(session.id, now);
    }
    return session;
  }
  public verifyCsrf(session: SessionWithUser, token?: string): void {
    if (!token || token.length > 128 || !timingSafeEqual(
      Buffer.from(digest(token), "hex"), Buffer.from(session.csrfTokenHash, "hex"),
    )) throw new AppError(403, "CSRF_INVALID", "La sesión cambió; vuelve a intentarlo");
  }
  public async csrf(session: SessionWithUser) {
    const csrfToken = newToken();
    await this.repository.rotateCsrf(session.id, digest(csrfToken));
    return { csrfToken };
  }
  public logout(session: SessionWithUser) { return this.repository.deleteSession(session.tokenHash); }
}
