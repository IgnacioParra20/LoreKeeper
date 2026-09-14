import { Prisma, type PrismaClient } from "@prisma/client";
import { AppError } from "../../shared/errors/app-error.js";
import type { IdentityRepository } from "./user.repository.js";

export class PrismaIdentityRepository implements IdentityRepository {
  public constructor(private readonly prisma: PrismaClient) {}
  public findUser(email: string) { return this.prisma.user.findUnique({ where: { email } }); }
  public async createUser(email: string, passwordHash: string) {
    try { return await this.prisma.user.create({ data: { email, passwordHash } }); }
    catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new AppError(409, "REGISTRATION_UNAVAILABLE", "No se pudo registrar esta dirección");
      }
      throw error;
    }
  }
  public createSession(data: Parameters<IdentityRepository["createSession"]>[0]) {
    return this.prisma.session.create({ data });
  }
  public findSession(tokenHash: string) {
    return this.prisma.session.findUnique({ where: { tokenHash }, include: { user: true } });
  }
  public async deleteSession(tokenHash: string) { await this.prisma.session.deleteMany({ where: { tokenHash } }); }
  public async touchSession(id: string, lastSeenAt: Date) {
    await this.prisma.session.updateMany({ where: { id, lastSeenAt: { lt: lastSeenAt } }, data: { lastSeenAt } });
  }
  public async rotateCsrf(id: string, csrfTokenHash: string) {
    await this.prisma.session.updateMany({ where: { id }, data: { csrfTokenHash } });
  }
}
