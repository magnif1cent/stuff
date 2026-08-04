-- Enables typo-tolerant ("did you mean?") fallback search on movie title
-- and director, used when an exact substring match returns nothing.
-- Indexed on lower(...) since matching elsewhere in the app is
-- case-insensitive and a plain-column index wouldn't accelerate that.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX "Movie_title_trgm_idx" ON "Movie" USING GIN (lower("title") gin_trgm_ops);
CREATE INDEX "Movie_director_trgm_idx" ON "Movie" USING GIN (lower("director") gin_trgm_ops);
