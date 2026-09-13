import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { createApp } from "./app.js";
import { InMemoryUniverseRepository } from "./test/in-memory-universe.repository.js";

describe("Universe API", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    app = createApp({ universeRepository: new InMemoryUniverseRepository() });
  });

  it("responde al health check", async () => {
    const response = await request(app).get("/health");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  it("crea y lista un universo", async () => {
    const created = await request(app).post("/api/universes").send({
      name: "  La Ciudad de Cristal  ",
      description: "Una metrópolis suspendida.",
    });

    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({
      name: "La Ciudad de Cristal",
      description: "Una metrópolis suspendida.",
      status: "ACTIVE",
    });

    const listed = await request(app).get("/api/universes");
    expect(listed.status).toBe(200);
    expect(listed.body.data).toHaveLength(1);
  });

  it("rechaza datos inválidos con el formato uniforme", async () => {
    const response = await request(app).post("/api/universes").send({ name: " " });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatchObject({
      code: "VALIDATION_ERROR",
      message: "Los datos enviados no son válidos",
    });
    expect(response.body.error.correlationId).toEqual(expect.any(String));
  });

  it("consulta un universo existente", async () => {
    const created = await request(app)
      .post("/api/universes")
      .send({ name: "Mar Interior" });

    const response = await request(app).get(`/api/universes/${created.body.data.id}`);

    expect(response.status).toBe(200);
    expect(response.body.data.name).toBe("Mar Interior");
  });

  it("responde 404 ante un id inexistente", async () => {
    const response = await request(app).get(
      "/api/universes/9a2bdf8b-d5f0-45b9-8a65-14fa14893122",
    );

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("UNIVERSE_NOT_FOUND");
  });

  it("actualiza un universo", async () => {
    const created = await request(app)
      .post("/api/universes")
      .send({ name: "Nombre inicial" });

    const response = await request(app)
      .patch(`/api/universes/${created.body.data.id}`)
      .send({ name: "Nombre definitivo", status: "ARCHIVED" });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      name: "Nombre definitivo",
      status: "ARCHIVED",
    });
  });

  it("elimina un universo", async () => {
    const created = await request(app)
      .post("/api/universes")
      .send({ name: "Universo temporal" });
    const id = created.body.data.id as string;

    expect((await request(app).delete(`/api/universes/${id}`)).status).toBe(204);
    expect((await request(app).get(`/api/universes/${id}`)).status).toBe(404);
  });
});
