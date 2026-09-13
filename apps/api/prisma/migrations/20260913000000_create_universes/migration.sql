CREATE TYPE "UniverseStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

CREATE TABLE "universes" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "status" "UniverseStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "universes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "universes_status_idx" ON "universes"("status");

