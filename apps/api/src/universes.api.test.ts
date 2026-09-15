import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { InMemoryIdentityRepository } from "./test/in-memory-identity.repository.js";
import { createApp } from "./app.js";
import { InMemoryUniverseRepository } from "./test/in-memory-universe.repository.js";
import { InMemoryCharacterRepository } from "./test/in-memory-character.repository.js";

describe("Universe API", () => {
  let app: ReturnType<typeof createApp>;

  let client: ReturnType<typeof request.agent>;
  beforeEach(async () => {
    const universeRepository = new InMemoryUniverseRepository();
    app = createApp({ universeRepository, characterRepository: new InMemoryCharacterRepository(universeRepository), identityRepository: new InMemoryIdentityRepository() });
    client = request.agent(app).set("Origin", "http://localhost:5173");
    const registered = await client.post("/api/auth/register").send({ email: "author@example.test", password: "A long test passphrase!" });
    client.set("X-CSRF-Token", registered.body.data.csrfToken as string);
  });

  it("responde al health check", async () => {
    const response = await client.get("/health");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  it("crea y lista un universo", async () => {
    const created = await client.post("/api/universes").send({
      name: "  La Ciudad de Cristal  ",
      description: "Una metrópolis suspendida.",
    });

    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({
      name: "La Ciudad de Cristal",
      description: "Una metrópolis suspendida.",
      status: "ACTIVE",
    });

    const listed = await client.get("/api/universes");
    expect(listed.status).toBe(200);
    expect(listed.body.data).toHaveLength(1);
  });

  it("rechaza datos inválidos con el formato uniforme", async () => {
    const response = await client.post("/api/universes").send({ name: " " });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatchObject({
      code: "VALIDATION_ERROR",
      message: "Los datos enviados no son válidos",
    });
    expect(response.body.error.correlationId).toEqual(expect.any(String));
  });

  it("consulta un universo existente", async () => {
    const created = await client
      .post("/api/universes")
      .send({ name: "Mar Interior" });

    const response = await client.get(`/api/universes/${created.body.data.id}`);

    expect(response.status).toBe(200);
    expect(response.body.data.name).toBe("Mar Interior");
  });

  it("responde 404 ante un id inexistente", async () => {
    const response = await client.get(
      "/api/universes/9a2bdf8b-d5f0-45b9-8a65-14fa14893122",
    );

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("UNIVERSE_NOT_FOUND");
  });

  it("actualiza un universo", async () => {
    const created = await client
      .post("/api/universes")
      .send({ name: "Nombre inicial" });

    const response = await client
      .patch(`/api/universes/${created.body.data.id}`)
      .send({ name: "Nombre definitivo", status: "ARCHIVED" });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      name: "Nombre definitivo",
      status: "ARCHIVED",
    });
  });

  it("elimina un universo", async () => {
    const created = await client
      .post("/api/universes")
      .send({ name: "Universo temporal" });
    const id = created.body.data.id as string;

    expect((await client.delete(`/api/universes/${id}`)).status).toBe(204);
    expect((await client.get(`/api/universes/${id}`)).status).toBe(404);
  });
});
