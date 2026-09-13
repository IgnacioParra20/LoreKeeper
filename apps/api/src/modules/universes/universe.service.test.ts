import { describe, expect, it } from "vitest";

import { InMemoryUniverseRepository } from "../../test/in-memory-universe.repository.js";
import { UniverseService } from "./universe.service.js";

describe("UniverseService", () => {
  it("crea universos activos por defecto", async () => {
    const service = new UniverseService(new InMemoryUniverseRepository());

    const universe = await service.create({ name: "Archivo Lunar" });

    expect(universe.status).toBe("ACTIVE");
    expect(universe.description).toBeNull();
  });

  it("expone un error de dominio estable para universos inexistentes", async () => {
    const service = new UniverseService(new InMemoryUniverseRepository());

    await expect(
      service.getById("9a2bdf8b-d5f0-45b9-8a65-14fa14893122"),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: "UNIVERSE_NOT_FOUND",
    });
  });
});
