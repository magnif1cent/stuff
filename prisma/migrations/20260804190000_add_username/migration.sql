-- Add a public username, replacing the free-text "name" field as the
-- identity shown on discussion posts, fight scenes, and editorial reviews.
ALTER TABLE "User" ADD COLUMN "username" TEXT;

-- Backfill existing rows from their email's local part, lowercased and
-- restricted to the app's username charset ([a-z0-9_]).
UPDATE "User"
SET "username" = NULLIF(
  regexp_replace(lower(split_part(COALESCE("email", ''), '@', 1)), '[^a-z0-9_]', '', 'g'),
  ''
)
WHERE "username" IS NULL;

-- Rows with no usable email-derived base (null/empty email, or an email
-- local part entirely stripped by the charset filter, or too short) fall
-- back to an id-derived placeholder, which is unique by construction.
UPDATE "User"
SET "username" = 'user' || substr("id", 1, 10)
WHERE "username" IS NULL OR length("username") < 3;

-- De-duplicate collisions (e.g. two accounts both deriving to "admin") by
-- suffixing every row after the first, ordered by account age.
WITH ranked AS (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "username" ORDER BY "createdAt", "id") AS rn
  FROM "User"
)
UPDATE "User" AS u
SET "username" = u."username" || ranked.rn::text
FROM ranked
WHERE u."id" = ranked."id" AND ranked.rn > 1;

ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;
ALTER TABLE "User" ADD CONSTRAINT "User_username_key" UNIQUE ("username");

ALTER TABLE "User" DROP COLUMN "name";
