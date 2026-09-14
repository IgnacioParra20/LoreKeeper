import { describe, expect, it } from "vitest";
import { registerSchema, loginSchema } from "./auth.schemas.js";
describe("credentials", () => {
  it("normalizes email without changing passwords or plus aliases", () => {
    const input = { email: "  Author+World@Example.test  ", password: "  a long passphrase  " };
    expect(registerSchema.parse(input)).toEqual({ email: "author+world@example.test", password: input.password });
  });
  it("rejects short/oversized registration passwords and extra keys", () => {
    for (const password of ["short", "x".repeat(129)]) expect(registerSchema.safeParse({ email: "a@example.test", password }).success).toBe(false);
    expect(registerSchema.safeParse({ email: "a@example.test", password: "valid long passphrase", ownerId: "injected" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "a@example.test", password: "short" }).success).toBe(true);
  });
});
