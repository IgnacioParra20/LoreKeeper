CREATE TABLE "characters" (
  "id" UUID NOT NULL,
  "universe_id" UUID NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "role" VARCHAR(120),
  "description" TEXT,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "characters_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "characters_universe_id_updated_at_idx" ON "characters"("universe_id", "updated_at");
ALTER TABLE "characters" ADD CONSTRAINT "characters_universe_id_fkey" FOREIGN KEY ("universe_id") REFERENCES "universes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
