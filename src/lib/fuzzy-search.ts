import { prisma } from "@/lib/prisma";
import type { Movie } from "@/generated/prisma/client";

// Below this, trigram similarity starts matching too many unrelated
// titles to be a useful "did you mean" suggestion.
const SIMILARITY_THRESHOLD = 0.25;

// Typo-tolerant fallback for when exact substring matching finds nothing —
// e.g. "Enther the Dragon" still finds "Enter the Dragon". Only covers
// title/director (not cast), and ignores other filters, since this is a
// last-resort "did you mean" suggestion rather than a full search pass.
export async function findSimilarMovies(query: string, limit = 8): Promise<Movie[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  return prisma.$queryRaw<Movie[]>`
    SELECT "Movie".*
    FROM "Movie"
    WHERE "status" = 'APPROVED'
      AND (similarity(lower("title"), lower(${trimmed})) > ${SIMILARITY_THRESHOLD}
       OR similarity(lower(COALESCE("director", '')), lower(${trimmed})) > ${SIMILARITY_THRESHOLD})
    ORDER BY GREATEST(
      similarity(lower("title"), lower(${trimmed})),
      similarity(lower(COALESCE("director", '')), lower(${trimmed}))
    ) DESC
    LIMIT ${limit}
  `;
}
