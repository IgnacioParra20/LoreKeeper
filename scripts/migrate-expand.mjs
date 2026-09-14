import { cp, mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";

// Apply only expansion, using the original migration files/checksums.
const root = resolve(import.meta.dirname, "..");
const require = createRequire(join(root, "apps/api/package.json"));
const source = join(root, "apps/api/prisma");
const temporary = await mkdtemp(join(tmpdir(), "lorekeeper-expand-"));
try {
  await cp(join(source, "schema.prisma"), join(temporary, "schema.prisma"));
  for (const name of await readdir(join(source, "migrations"))) {
    if (name === "migration_lock.toml" || name <= "20260914000000_auth_expand") {
      await cp(join(source, "migrations", name), join(temporary, "migrations", name), { recursive: true });
    }
  }
  const result = spawnSync(process.execPath, [require.resolve("prisma/build/index.js"), "migrate", "deploy", "--schema", join(temporary, "schema.prisma")], { stdio: "inherit", env: process.env });
  process.exitCode = result.status ?? 1;
} finally { await rm(temporary, { recursive: true, force: true }); }
