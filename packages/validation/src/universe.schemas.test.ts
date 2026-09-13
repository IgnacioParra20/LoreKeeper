import { describe, expect, it } from "vitest";

import { createUniverseSchema, updateUniverseSchema } from "./universe.schemas.js";

describe("universe schemas", () => {
  it("normaliza un universo válido", () => {
    const result = createUniverseSchema.parse({
      name: "  Crónicas del Alba  ",
      description: "  Un mundo que despierta.  ",
    });

    expect(result).toEqual({
      name: "Crónicas del Alba",
      description: "Un mundo que despierta.",
    });
  });

  it("rechaza nombres vacíos y campos desconocidos", () => {
    expect(
      createUniverseSchema.safeParse({ name: "   ", unexpected: true }).success,
    ).toBe(false);
  });

  it("exige al menos un cambio en PATCH", () => {
    expect(updateUniverseSchema.safeParse({}).success).toBe(false);
    expect(updateUniverseSchema.safeParse({ status: "ARCHIVED" }).success).toBe(true);
  });
});

