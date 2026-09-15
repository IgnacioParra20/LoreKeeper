import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import { InMemoryIdentityRepository } from "./test/in-memory-identity.repository.js";
import { InMemoryUniverseRepository } from "./test/in-memory-universe.repository.js";
import { InMemoryCharacterRepository } from "./test/in-memory-character.repository.js";

const origin = "http://localhost:5173";
const password = "A sufficiently long password!";
describe("Character API", () => {
  let app: ReturnType<typeof createApp>;
  beforeEach(() => {
    const worlds = new InMemoryUniverseRepository();
    app = createApp({ identityRepository: new InMemoryIdentityRepository(), universeRepository: worlds,
      characterRepository: new InMemoryCharacterRepository(worlds) });
  });
  const author = async (email: string) => {
    const client = request.agent(app).set("Origin", origin);
    const registered = await client.post("/api/auth/register").send({ email, password });
    expect(registered.status).toBe(201);
    client.set("X-CSRF-Token", registered.body.data.csrfToken as string);
    return client;
  };
  it("creates, lists, edits and deletes a character; protects a populated universe", async () => {
    const a = await author("a@example.test");
    const world = await a.post("/api/universes").send({ name: "Fenix" });
    const worldId = world.body.data.id as string;
    const base = `/api/universes/${worldId}/characters`;
    expect((await a.get(base)).body.data).toEqual([]);
    const created = await a.post(base).send({ name: "  Aria  ", role: "Guardiana", description: "Custodia el fuego." });
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({ name: "Aria", role: "Guardiana", universeId: worldId });
    expect(created.body.data).not.toHaveProperty("ownerId");
    const id = created.body.data.id as string;
    expect((await a.get(base)).body.data).toHaveLength(1);
    expect((await a.get(`${base}/${id}`)).body.data.description).toBe("Custodia el fuego.");
    expect((await a.delete(`/api/universes/${worldId}`)).body.error.code).toBe("UNIVERSE_HAS_CHARACTERS");
    expect((await a.patch(`${base}/${id}`).send({ role: "Protagonista", description: null })).body.data).toMatchObject({ role: "Protagonista", description: null });
    expect((await a.delete(`${base}/${id}`)).status).toBe(204);
    expect((await a.delete(`/api/universes/${worldId}`)).status).toBe(204);
  });
  it("hides characters from another owner and does not mutate them", async () => {
    const a = await author("a@example.test"); const b = await author("b@example.test");
    const worldId = (await a.post("/api/universes").send({ name: "Private" })).body.data.id as string;
    const otherWorldId = (await b.post("/api/universes").send({ name: "Other" })).body.data.id as string;
    const id = (await a.post(`/api/universes/${worldId}/characters`).send({ name: "Secret" })).body.data.id as string;
    for (const client of [b]) {
      expect((await client.get(`/api/universes/${worldId}/characters`)).status).toBe(404);
      expect((await client.post(`/api/universes/${worldId}/characters`).send({ name: "Intruder" })).status).toBe(404);
      expect((await client.get(`/api/universes/${worldId}/characters/${id}`)).status).toBe(404);
      expect((await client.patch(`/api/universes/${worldId}/characters/${id}`).send({ name: "Changed" })).status).toBe(404);
      expect((await client.delete(`/api/universes/${worldId}/characters/${id}`)).status).toBe(404);
      expect((await client.get(`/api/universes/${otherWorldId}/characters/${id}`)).status).toBe(404);
    }
    expect((await a.get(`/api/universes/${worldId}/characters/${id}`)).body.data.name).toBe("Secret");
  });
  it("requires session, origin, CSRF and strict input", async () => {
    const a = await author("a@example.test");
    const worldId = (await a.post("/api/universes").send({ name: "World" })).body.data.id as string;
    const base = `/api/universes/${worldId}/characters`;
    expect((await request(app).get(base)).status).toBe(401);
    expect((await a.post(base).set("X-CSRF-Token", "bad").send({ name: "No" })).status).toBe(403);
    expect((await a.post(base).set("Origin", "https://evil.test").send({ name: "No" })).status).toBe(403);
    expect((await a.post(base).send({ name: "", ownerId: "injected" })).status).toBe(400);
    expect((await a.patch(`${base}/00000000-0000-4000-8000-000000000000`).send({})).status).toBe(400);
    expect((await a.get(base)).body.data).toEqual([]);
  });
});
