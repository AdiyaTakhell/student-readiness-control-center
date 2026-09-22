ALTER TABLE "tenants"
    ADD COLUMN "slug" VARCHAR(80);

UPDATE "tenants"
SET "slug" = 'acme'
WHERE "id" = '00000000-0000-0000-0000-000000000001';

UPDATE "tenants"
SET "slug" = 'beta'
WHERE "id" = '00000000-0000-0000-0000-000000000002';

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "tenants"
        WHERE "slug" IS NULL
    ) THEN
        RAISE EXCEPTION
            'Cannot make tenants.slug NOT NULL: one or more tenants have no slug';
END IF;
END $$;

ALTER TABLE "tenants"
    ALTER COLUMN "slug" SET NOT NULL;

CREATE UNIQUE INDEX "tenants_slug_key"
    ON "tenants"("slug");