import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { cp, mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import { PrismaIdentityRepository } from "./modules/users/prisma-identity.repository.js";
import { PrismaUniverseRepository } from "./modules/universes/prisma-universe.repository.js";
import { hashPassword } from "./modules/auth/password.js";

const require = createRequire(import.meta.url);
const prismaCli = require.resolve("prisma/build/index.js");
const prismaDir = fileURLToPath(new URL("../prisma/", import.meta.url));
const origin = "http://localhost:5173";
const password = "A postgres test passphrase!";
const configured = process.env.TEST_DATABASE_URL;

describe.skipIf(!configured)("PostgreSQL real: auth, ownership and migrations", () => {
  const schema = `auth_test_${randomUUID().replaceAll("-", "")}`;
  const legacySchema = `${schema}_legacy`;
  let admin: PrismaClient;
  let prisma: PrismaClient;
  let url: string;
  const deploy = async (target: string, through = "99999999999999") => {
    const temporary = await mkdtemp(join(tmpdir(), "lorekeeper-migrations-"));
    try {
      await cp(join(prismaDir, "schema.prisma"), join(temporary, "schema.prisma"));
      for (const name of await readdir(join(prismaDir, "migrations"))) {
        if (name === "migration_lock.toml" || name <= through) await cp(join(prismaDir, "migrations", name), join(temporary, "migrations", name), { recursive: true });
      }
      execFileSync(process.execPath, [prismaCli, "migrate", "deploy", "--schema", join(temporary, "schema.prisma")], { env: { ...process.env, DATABASE_URL: target }, stdio: "pipe", timeout: 120_000 });
    } finally { await rm(temporary, { recursive: true, force: true }); }
  };
  beforeAll(async () => {
    const base = new URL(configured!);
    if (!/^\/lorekeeper_test(?:_[a-z0-9_]+)?$/.test(base.pathname)) throw new Error("Integration tests require a dedicated lorekeeper_test database");
    admin = new PrismaClient({ datasources: { db: { url: base.toString() } } });
    await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    await admin.$executeRawUnsafe(`CREATE SCHEMA "${legacySchema}"`);
    base.searchParams.set("schema", schema); url = base.toString();
    await deploy(url);
    prisma = new PrismaClient({ datasources: { db: { url } } });
  }, 180_000);
  afterAll(async () => {
    await prisma?.$disconnect();
    if (admin) {
      // Only random schemas owned by this test in a database validated above.
      await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${legacySchema}" CASCADE`);
      await admin.$disconnect();
    }
  });
  it("persists sessions across app instances and isolates every CRUD operation", async () => {
    const makeApp = () => createApp({ identityRepository: new PrismaIdentityRepository(prisma), universeRepository: new PrismaUniverseRepository(prisma) });
    const app = makeApp();
    const a = request.agent(app).set("Origin", origin);
    const b = request.agent(app).set("Origin", origin);
    const registered = await a.post("/api/auth/register").send({ email: "a@example.test", password });
    expect(registered.status).toBe(201);
    a.set("X-CSRF-Token", registered.body.data.csrfToken as string);
    const registeredB = await b.post("/api/auth/register").send({ email: "b@example.test", password });
    b.set("X-CSRF-Token", registeredB.body.data.csrfToken as string);
    const originalCookie = (registered.headers["set-cookie"] as unknown as string[])[0]!.split(";")[0]!;
    expect((await request(makeApp()).get("/api/auth/me").set("Cookie", originalCookie)).status).toBe(200);
    const created = await a.post("/api/universes").send({ name: "Persisted A" });
    expect(created.status).toBe(201);
    const id = created.body.data.id as string;
    const userId = registered.body.data.user.id as string;
    expect((await prisma.universe.findUniqueOrThrow({ where: { id } })).ownerId).toBe(userId);
    expect((await b.get("/api/universes")).body.data).toEqual([]);
    expect((await b.get(`/api/universes/${id}`)).status).toBe(404);
    expect((await b.patch(`/api/universes/${id}`).send({ name: "Stolen" })).status).toBe(404);
    expect((await b.delete(`/api/universes/${id}`)).status).toBe(404);
    expect((await a.patch(`/api/universes/${id}`).send({ name: "Updated A" })).status).toBe(200);
    expect((await a.get(`/api/universes/${id}`)).body.data.name).toBe("Updated A");
    expect((await a.post("/api/universes").set("X-CSRF-Token", "invalid").send({ name: "Rejected" })).status).toBe(403);
    expect(await prisma.universe.count()).toBe(1);
    const stored = await prisma.session.findFirstOrThrow({ where: { userId } });
    expect(stored.tokenHash).not.toBe(originalCookie.split("=")[1]);
    expect((await a.delete(`/api/universes/${id}`)).status).toBe(204);
    expect((await a.get(`/api/universes/${id}`)).status).toBe(404);
    expect((await a.post("/api/auth/logout")).status).toBe(204);
    expect((await request(makeApp()).get("/api/auth/me").set("Cookie", originalCookie)).status).toBe(401);
    const concurrent = await Promise.all(["C@example.test", " c@example.test "].map((email) => request(app).post("/api/auth/register").set("Origin", origin).send({ email, password })));
    expect(concurrent.map((result) => result.status).sort()).toEqual([201, 409]);
    await prisma.user.update({ where: { email: "b@example.test" }, data: { status: "DISABLED" } });
    expect((await b.get("/api/auth/me")).status).toBe(401);
  }, 30_000);
  it("preserves populated legacy universes and refuses closing ownership before assignment", async () => {
    const target = new URL(url); target.searchParams.set("schema", legacySchema);
    await deploy(target.toString(), "20260913000000_create_universes");
    const legacy = new PrismaClient({ datasources: { db: { url: target.toString() } } });
    try {
      const id = randomUUID();
      await legacy.$executeRaw`INSERT INTO universes(id, name, updated_at) VALUES (${id}::uuid, 'Legacy world', NOW())`;
      await deploy(target.toString(), "20260914000000_auth_expand");
      expect(() => execFileSync(process.execPath, [prismaCli, "db", "execute", "--file", join(prismaDir, "migrations/20260914000100_auth_contract/migration.sql"), "--schema", join(prismaDir, "schema.prisma")], { env: { ...process.env, DATABASE_URL: target.toString() }, stdio: "pipe", timeout: 60_000 })).toThrow();
      const preserved = await legacy.$queryRaw<Array<{ name: string; owner_id: string | null }>>`SELECT name, owner_id FROM universes`;
      expect(preserved).toEqual([{ name: "Legacy world", owner_id: null }]);
      const user = await legacy.user.create({ data: { email: "legacy@example.test", passwordHash: await hashPassword(password) } });
      await legacy.$executeRaw`UPDATE universes SET owner_id = ${user.id}::uuid WHERE id = ${id}::uuid AND owner_id IS NULL`;
      await deploy(target.toString());
      expect(await legacy.universe.findUniqueOrThrow({ where: { id } })).toMatchObject({ name: "Legacy world", ownerId: user.id });
      const columns = await legacy.$queryRaw<Array<{ is_nullable: string }>>`SELECT is_nullable FROM information_schema.columns WHERE table_schema = ${legacySchema} AND table_name = 'universes' AND column_name = 'owner_id'`;
      expect(columns[0]?.is_nullable).toBe("NO");
    } finally { await legacy.$disconnect(); }
  }, 180_000);
});
