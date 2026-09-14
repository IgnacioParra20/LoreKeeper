import { randomBytes } from "node:crypto";
import argon2 from "argon2";

export const hashPassword = (password: string) => argon2.hash(password, {
  type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1,
});
export const verifyPassword = (hash: string, password: string) => argon2.verify(hash, password);
let dummyHash: Promise<string> | undefined;
export const getDummyHash = () => dummyHash ??= hashPassword(randomBytes(32).toString("hex"));
