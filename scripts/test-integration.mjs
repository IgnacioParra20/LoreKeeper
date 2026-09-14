import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
if (!process.env.TEST_DATABASE_URL) throw new Error("Set TEST_DATABASE_URL to a dedicated lorekeeper_test database");
const root = resolve(import.meta.dirname, "..");
const require = createRequire(resolve(root, "apps/api/package.json"));
const result = spawnSync(process.execPath, [resolve(dirname(require.resolve("vitest/package.json")), "vitest.mjs"), "run", "src/auth.postgres.test.ts", "--maxWorkers=1"], { cwd: resolve(root, "apps/api"), stdio: "inherit", env: process.env });
process.exitCode = result.status ?? 1;
