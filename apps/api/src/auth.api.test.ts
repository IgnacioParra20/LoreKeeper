import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import { InMemoryIdentityRepository } from "./test/in-memory-identity.repository.js";
import { InMemoryUniverseRepository } from "./test/in-memory-universe.repository.js";
import { InMemoryCharacterRepository } from "./test/in-memory-character.repository.js";

const origin = "http://localhost:5173";
const password = "An adequate test passphrase!";
describe("Auth and ownership HTTP", () => {
  const repositories = () => {
    const universeRepository = new InMemoryUniverseRepository();
    return { universeRepository, characterRepository: new InMemoryCharacterRepository(universeRepository) };
  };
  let identities: InMemoryIdentityRepository;
  let app: ReturnType<typeof createApp>;
  beforeEach(() => {
    identities = new InMemoryIdentityRepository();
    app = createApp({ identityRepository: identities, ...repositories() });
  });
  const register = async (email = "a@example.test") => {
    const client = request.agent(app).set("Origin", origin);
    const response = await client.post("/api/auth/register").send({ email, password });
    expect(response.status).toBe(201);
    client.set("X-CSRF-Token", response.body.data.csrfToken as string);
    return { client, response };
  };
  it("normalizes email, hashes passwords and issues a private cookie without leaking secrets", async () => {
    const { client, response } = await register("  A@Example.test  ");
    expect(response.body.data.user.email).toBe("a@example.test");
    expect(response.body.data.user).not.toHaveProperty("passwordHash");
    expect(response.body.data).not.toHaveProperty("token");
    const cookies = response.headers["set-cookie"] as unknown as string[];
    expect(cookies[0]).toContain("HttpOnly"); expect(cookies[0]).toContain("SameSite=Lax");
    expect(cookies[0]).not.toContain("Domain=");
    expect([...identities.users.values()][0]?.passwordHash).toMatch(/^\$argon2id\$/);
    const me = await client.get("/api/auth/me");
    expect(me.status).toBe(200); expect(me.headers["cache-control"]).toBe("no-store");
    expect((await client.post("/api/auth/register").send({ email: "a@example.test", password })).status).toBe(409);
  });
  it("blocks every anonymous universe operation and rejects forged ownership", async () => {
    for (const method of ["get", "post", "patch", "delete"] as const) {
      const path = ["patch", "delete"].includes(method) ? "/api/universes/9a2bdf8b-d5f0-45b9-8a65-14fa14893122" : "/api/universes";
      expect((await request(app)[method](path).set("Origin", origin)).status).toBe(401);
    }
    const { client } = await register();
    expect((await client.post("/api/universes").send({ name: "World", ownerId: "other" })).status).toBe(400);
  });
  it("isolates two authors on reads, lists and atomic writes", async () => {
    const a = await register(); const b = await register("b@example.test");
    const created = await a.client.post("/api/universes").send({ name: "Private A" });
    const id = created.body.data.id as string;
    await b.client.post("/api/universes").send({ name: "Private B" });
    expect((await a.client.get("/api/universes")).body.data).toHaveLength(1);
    expect((await b.client.get("/api/universes")).body.data[0].name).toBe("Private B");
    for (const method of ["get", "patch", "delete"] as const) {
      const attempt = b.client[method](`/api/universes/${id}`);
      if (method === "patch") attempt.send({ name: "Stolen" });
      const result = await attempt;
      expect(result.status).toBe(404); expect(result.body.error.code).toBe("UNIVERSE_NOT_FOUND");
    }
    expect((await a.client.get(`/api/universes/${id}`)).body.data.name).toBe("Private A");
  });
  it("rejects CSRF and origins before mutation; refreshes CSRF", async () => {
    const { client } = await register();
    expect((await client.post("/api/universes").set("X-CSRF-Token", "wrong").send({ name: "No" })).status).toBe(403);
    expect((await client.post("/api/universes").set("Origin", "https://evil.test").send({ name: "No" })).status).toBe(403);
    expect((await client.get("/api/universes")).body.data).toHaveLength(0);
    const fresh = await client.get("/api/auth/csrf");
    expect((await client.post("/api/universes").send({ name: "Old token" })).status).toBe(403);
    client.set("X-CSRF-Token", fresh.body.data.csrfToken as string);
    expect((await client.post("/api/universes").send({ name: "Fresh token" })).status).toBe(201);
    expect((await request(app).post("/api/auth/login").send({ email: "a@example.test", password })).status).toBe(403);
  });
  it("uses generic login errors, rotates session and revokes logout tokens", async () => {
    const { client, response } = await register();
    const originalCookie = (response.headers["set-cookie"] as unknown as string[])[0]!.split(";")[0]!;
    const wrong = await client.post("/api/auth/login").send({ email: "a@example.test", password: "bad" });
    const absent = await client.post("/api/auth/login").send({ email: "none@example.test", password: "bad" });
    expect(wrong.status).toBe(401); expect(wrong.body.error.message).toBe(absent.body.error.message);
    const login = await client.post("/api/auth/login").send({ email: "a@example.test", password });
    expect(login.status).toBe(200);
    expect((await request(app).get("/api/auth/me").set("Cookie", originalCookie)).status).toBe(401);
    client.set("X-CSRF-Token", login.body.data.csrfToken as string);
    expect((await client.post("/api/auth/logout")).status).toBe(204);
    expect((await client.get("/api/auth/me")).status).toBe(401);
    expect(identities.sessions.size).toBe(0);
  });
  it.each(["absolute", "idle", "disabled", "forged"])("rejects %s sessions", async (kind) => {
    const { client } = await register();
    const session = [...identities.sessions.values()][0]!;
    if (kind === "absolute") session.expiresAt = new Date(0);
    if (kind === "idle") session.lastSeenAt = new Date(0);
    if (kind === "disabled") identities.users.get(session.userId)!.status = "DISABLED";
    const result = kind === "forged"
      ? await request(app).get("/api/auth/me").set("Cookie", `lorekeeper_session=${"x".repeat(43)}`)
      : await client.get("/api/auth/me");
    expect(result.status).toBe(401);
  });
  it("limits login and sends Retry-After", async () => {
    app = createApp({ identityRepository: identities, ...repositories(), auth: { loginEmailLimit: 1 } });
    const client = request(app);
    await client.post("/api/auth/login").set("Origin", origin).send({ email: "absent@example.test", password });
    const response = await client.post("/api/auth/login").set("Origin", origin).send({ email: "ABSENT@example.test", password });
    expect(response.status).toBe(429); expect(Number(response.headers["retry-after"])).toBeGreaterThan(0);
  });
  it("emits Secure host-prefixed cookies when configured", async () => {
    app = createApp({ identityRepository: identities, ...repositories(), auth: { secureCookies: true } });
    const response = await request(app).post("/api/auth/register").set("Origin", origin).send({ email: "secure@example.test", password });
    const cookie = (response.headers["set-cookie"] as unknown as string[])[0]!;
    expect(cookie).toContain("__Host-lorekeeper_session="); expect(cookie).toContain("Secure"); expect(cookie).toContain("Path=/");
  });
});
