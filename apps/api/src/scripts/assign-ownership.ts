import { randomBytes } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { Prisma, PrismaClient } from "@prisma/client";
import { z } from "zod";
import { emailSchema } from "@lorekeeper/validation";
import { hashPassword } from "../modules/auth/password.js";

// Offline bootstrap; the operator must explicitly name every universe to assign.
const [emailArg, ...idArgs] = process.argv.slice(2);
const email = emailSchema.parse(emailArg);
const ids = z.array(z.string().uuid()).min(1).parse(idArgs);
if (new Set(ids).size !== ids.length) throw new Error("Duplicate universe IDs");
const prisma = new PrismaClient();
const credentialsPath = resolve(process.cwd(), "../../.local/auth-bootstrap.txt");
const password = randomBytes(24).toString("base64url");
let wroteCredentials = false;
try {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing?.status === "DISABLED") throw new Error("The selected user is disabled");
  const passwordHash = existing ? null : await hashPassword(password);
  if (!existing) {
    await mkdir(dirname(credentialsPath), { recursive: true });
    await writeFile(credentialsPath, `LoreKeeper - cuenta local de prueba\nEmail: ${email}\nContraseña: ${password}\nURL: http://localhost:5173\n`, { flag: "wx", mode: 0o600 });
    wroteCredentials = true;
  }
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('LOCK TABLE "universes" IN ACCESS EXCLUSIVE MODE');
    const selected = await tx.$queryRaw<Array<{ id: string; owner_id: string | null }>>`
      SELECT id::text, owner_id::text FROM universes WHERE id::text IN (${Prisma.join(ids)})`;
    if (selected.length !== ids.length || selected.some((row) => row.owner_id !== null)) throw new Error("Every requested universe must exist and be unassigned");
    const user = existing ?? await tx.user.create({ data: { email, passwordHash: passwordHash! } });
    const changed = await tx.$executeRaw`UPDATE universes SET owner_id = ${user.id}::uuid WHERE id::text IN (${Prisma.join(ids)}) AND owner_id IS NULL`;
    if (changed !== ids.length) throw new Error("Ownership count mismatch");
  });
  console.log(`Assigned ${ids.length} universes. ${wroteCredentials ? `Credentials saved locally: ${credentialsPath}` : "Existing account credentials preserved."}`);
} catch (error) {
  if (wroteCredentials) await unlink(credentialsPath);
  throw error;
} finally { await prisma.$disconnect(); }
