-- Allows mixed-case usernames (previously restricted to lowercase) while
-- keeping uniqueness case-insensitive, so "NashPopoB" and "nashpopob" can't
-- both be registered. usernameLower becomes the real uniqueness/lookup key;
-- username stays for case-preserving display only.
ALTER TABLE "User" ADD COLUMN "usernameLower" TEXT;

-- Backfill is a plain lower() with no dedup pass needed (unlike the
-- original add_username migration) — every existing username was already
-- restricted to [a-z0-9_], so lower(username) = username for every row and
-- can't introduce a new collision among rows that were already unique.
UPDATE "User"
SET "usernameLower" = lower("username")
WHERE "usernameLower" IS NULL;

ALTER TABLE "User" ALTER COLUMN "usernameLower" SET NOT NULL;
ALTER TABLE "User" ADD CONSTRAINT "User_usernameLower_key" UNIQUE ("usernameLower");

-- username itself is no longer the uniqueness key, so its own constraint
-- is redundant now that usernameLower enforces case-insensitive uniqueness.
ALTER TABLE "User" DROP CONSTRAINT "User_username_key";
