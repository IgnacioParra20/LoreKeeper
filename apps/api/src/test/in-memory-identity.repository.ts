import { randomUUID } from "node:crypto";
import type { User, Session } from "@prisma/client";
import { AppError } from "../shared/errors/app-error.js";
import type { IdentityRepository, SessionWithUser } from "../modules/users/user.repository.js";

export class InMemoryIdentityRepository implements IdentityRepository {
  public readonly users = new Map<string, User>();
  public readonly sessions = new Map<string, Session>();
  public findUser(email: string) { return Promise.resolve([...this.users.values()].find((user) => user.email === email) ?? null); }
  public createUser(email: string, passwordHash: string): Promise<User> {
    if ([...this.users.values()].some((user) => user.email === email)) throw new AppError(409, "REGISTRATION_UNAVAILABLE", "No se pudo registrar esta dirección");
    const user: User = { id: randomUUID(), email, passwordHash, status: "ACTIVE", createdAt: new Date(), updatedAt: new Date() };
    this.users.set(user.id, user);
    return Promise.resolve(user);
  }
  public createSession(data: Parameters<IdentityRepository["createSession"]>[0]): Promise<Session> {
    const session = { ...data, id: randomUUID(), createdAt: new Date(), lastSeenAt: new Date() };
    this.sessions.set(session.tokenHash, session);
    return Promise.resolve(session);
  }
  public findSession(tokenHash: string): Promise<SessionWithUser | null> {
    const session = this.sessions.get(tokenHash);
    const user = session ? this.users.get(session.userId) : undefined;
    return Promise.resolve(session && user ? { ...session, user } : null);
  }
  public deleteSession(tokenHash: string) { this.sessions.delete(tokenHash); return Promise.resolve(); }
  public touchSession(id: string, lastSeenAt: Date) {
    const session = [...this.sessions.values()].find((value) => value.id === id);
    if (session) session.lastSeenAt = lastSeenAt;
    return Promise.resolve();
  }
  public rotateCsrf(id: string, csrfTokenHash: string) {
    const session = [...this.sessions.values()].find((value) => value.id === id);
    if (session) session.csrfTokenHash = csrfTokenHash;
    return Promise.resolve();
  }
}
