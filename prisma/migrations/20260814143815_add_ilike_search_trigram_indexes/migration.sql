-- Prisma's `contains` + `mode: "insensitive"` filter compiles to a plain
-- `column ILIKE ('%' || $1 || '%')` on Postgres — NOT `lower(column) LIKE
-- lower($1)`. The trigram indexes from the earlier fuzzy-search migration
-- were built on the `lower(...)` expression specifically for that
-- migration's `similarity(lower(...), ...)` calls, so they're a different
-- expression than a plain ILIKE and Postgres can't substitute them here
-- (confirmed via EXPLAIN with enable_seqscan=off: title/director ILIKE fell
-- back to a post-filter scan, and Person.name — which had no trigram index
-- at all, only a plain btree one that can't accelerate a leading-wildcard
-- ILIKE — forced a full Seq Scan).
--
-- These are plain (non-`lower()`-wrapped) trigram indexes, one per column
-- actually queried via `contains`/insensitive across the app: the navbar
-- search (/api/search), the movie search page and its director/actor
-- autocomplete endpoints (/api/directors, /api/actors), and the fight-scene
-- search page and its actor endpoint (/api/fight-scene-actors). pg_trgm's
-- GIN opclass supports the `~~*` (ILIKE) operator directly, so no
-- expression wrapper is needed for these to be used.
CREATE INDEX "Movie_title_ilike_trgm_idx" ON "Movie" USING GIN ("title" gin_trgm_ops);
CREATE INDEX "Movie_director_ilike_trgm_idx" ON "Movie" USING GIN ("director" gin_trgm_ops);
CREATE INDEX "Person_name_ilike_trgm_idx" ON "Person" USING GIN ("name" gin_trgm_ops);
CREATE INDEX "FightScene_title_ilike_trgm_idx" ON "FightScene" USING GIN ("title" gin_trgm_ops);
