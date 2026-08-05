import { prisma } from "@/lib/prisma";
import { searchTmdbMovies } from "@/lib/tmdb";
import { importMovieFromTmdb } from "@/lib/tmdb-import";

export async function searchTmdbMoviesForSubmission(query: string) {
  const results = await searchTmdbMovies(query);
  const existing = await prisma.movie.findMany({
    where: { tmdbId: { in: results.map((r) => r.id) } },
    select: { tmdbId: true, status: true },
  });
  const statusByTmdbId = new Map(existing.map((m) => [m.tmdbId, m.status]));
  return results.map((r) => ({ ...r, catalogStatus: statusByTmdbId.get(r.id) ?? null }));
}

// Guards against the member-submission path ever calling
// importMovieFromTmdb's upsert on a tmdbId that already exists — that upsert
// always applies whatever status it's given, so submitting an already-live
// movie again would silently demote it back to PENDING and pull it off the
// site until an admin re-approves it.
export async function submitMovieForReview(tmdbId: number, submittedById: string) {
  const existing = await prisma.movie.findUnique({ where: { tmdbId }, select: { status: true } });
  if (existing) {
    return {
      error:
        existing.status === "PENDING"
          ? "This movie has already been submitted and is awaiting admin review."
          : "This movie is already in the catalog.",
    };
  }

  const movie = await importMovieFromTmdb(tmdbId, { status: "PENDING", submittedById });
  return { movie };
}
