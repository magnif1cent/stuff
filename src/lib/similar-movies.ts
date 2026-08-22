import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

const GENRE_WEIGHT = 2;
const CAST_WEIGHT = 3;
const DIRECTOR_WEIGHT = 3;
const COLLECTION_WEIGHT = 10;
const MAX_RESULTS = 8;

export interface SimilarMovie {
  id: string;
  title: string;
  posterPath: string | null;
  posterOverrideUrl: string | null;
  releaseDate: Date | null;
  tmdbRating: number | null;
}

// Blends three signals TMDB's own "similar movies" endpoint can't see --
// shared genres, shared cast/director, and same franchise/collection --
// scored and ranked, entirely from this catalog's own data. Collection
// carries the heaviest weight since two entries in the same franchise are
// the strongest possible "you'll like this too" signal; genre the lightest,
// since in a catalog this genre-homogeneous almost everything shares one.
export async function getSimilarMovies(movie: {
  id: string;
  director: string | null;
  collectionTmdbId: number | null;
}): Promise<SimilarMovie[]> {
  const [genreRows, castRows] = await Promise.all([
    prisma.movie.findUnique({ where: { id: movie.id }, select: { genres: { select: { id: true } } } }),
    prisma.castCredit.findMany({ where: { movieId: movie.id }, select: { personId: true } }),
  ]);
  const genreIds = genreRows?.genres.map((g) => g.id) ?? [];
  const castPersonIds = castRows.map((c) => c.personId);

  const orConditions: Prisma.MovieWhereInput[] = [];
  if (genreIds.length > 0) orConditions.push({ genres: { some: { id: { in: genreIds } } } });
  if (castPersonIds.length > 0) orConditions.push({ cast: { some: { personId: { in: castPersonIds } } } });
  if (movie.director) orConditions.push({ director: movie.director });
  if (movie.collectionTmdbId) orConditions.push({ collectionTmdbId: movie.collectionTmdbId });

  if (orConditions.length === 0) return [];

  const candidates = await prisma.movie.findMany({
    where: { id: { not: movie.id }, status: "APPROVED", OR: orConditions },
    select: {
      id: true,
      title: true,
      posterPath: true,
      posterOverrideUrl: true,
      releaseDate: true,
      tmdbRating: true,
      director: true,
      collectionTmdbId: true,
      genres: { select: { id: true } },
      cast: { select: { personId: true } },
    },
  });

  const genreIdSet = new Set(genreIds);
  const castIdSet = new Set(castPersonIds);

  const scored = candidates.map((candidate) => {
    let score = candidate.genres.filter((g) => genreIdSet.has(g.id)).length * GENRE_WEIGHT;
    score += candidate.cast.filter((c) => castIdSet.has(c.personId)).length * CAST_WEIGHT;
    if (movie.director && candidate.director === movie.director) score += DIRECTOR_WEIGHT;
    if (movie.collectionTmdbId && candidate.collectionTmdbId === movie.collectionTmdbId) {
      score += COLLECTION_WEIGHT;
    }
    return { candidate, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RESULTS)
    .map((s) => ({
      id: s.candidate.id,
      title: s.candidate.title,
      posterPath: s.candidate.posterPath,
      posterOverrideUrl: s.candidate.posterOverrideUrl,
      releaseDate: s.candidate.releaseDate,
      tmdbRating: s.candidate.tmdbRating,
    }));
}
