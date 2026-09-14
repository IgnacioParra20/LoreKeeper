import type { User, Session } from "@prisma/client";

export type SessionWithUser = Session & { user: User };
export interface IdentityRepository {
  findUser(email: string): Promise<User | null>;
  createUser(email: string, passwordHash: string): Promise<User>;
  createSession(data: Pick<Session, "userId" | "tokenHash" | "csrfTokenHash" | "expiresAt">): Promise<Session>;
  findSession(tokenHash: string): Promise<SessionWithUser | null>;
  deleteSession(tokenHash: string): Promise<void>;
  touchSession(id: string, lastSeenAt: Date): Promise<void>;
  rotateCsrf(id: string, csrfTokenHash: string): Promise<void>;
}
