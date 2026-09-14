BEGIN;
LOCK TABLE "universes" IN ACCESS EXCLUSIVE MODE;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "universes" WHERE "owner_id" IS NULL) THEN
    RAISE EXCEPTION 'Ownership migration blocked: explicitly assign every existing universe before applying auth_contract. See docs/architecture/auth-migration.md.';
  END IF;
END $$;
ALTER TABLE "universes" ALTER COLUMN "owner_id" SET NOT NULL;
COMMIT;
