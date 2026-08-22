import { prisma } from "@/lib/prisma";
import { getTmdbMovieDetails, extractUsCertification, extractOriginalLanguageName } from "@/lib/tmdb";

const MAX_CAST = 30;

export interface ImportMovieOptions {
  // Admin imports (single-title, keyword, bulk CSV) go straight to APPROVED
  // by omitting this. Member submissions pass "PENDING" so the movie is
  // hidden from public discovery until an admin approves it. Note: an
  // existing movie re-imported by an admin always resets to APPROVED, since
  // an admin action is itself an approval — see submitMovieForReview, which
  // guards against calling this at all for a tmdbId that already exists.
  status?: "PENDING" | "APPROVED";
  submittedById?: string;
}

export async function importMovieFromTmdb(tmdbId: number, options: ImportMovieOptions = {}) {
  const details = await getTmdbMovieDetails(tmdbId);
  const director = details.credits.crew.find((c) => c.job === "Director")?.name ?? null;
  const country = details.production_countries[0]?.name ?? null;
  const studio = details.production_companies[0]?.name ?? null;
  const certification = extractUsCertification(details);
  const originalLanguage = extractOriginalLanguageName(details);
  const tagline = details.tagline || null;
  const revenue = details.revenue || null;
  const collectionName = details.belongs_to_collection?.name ?? null;
  const collectionTmdbId = details.belongs_to_collection?.id ?? null;
  const topCast = [...details.credits.cast].sort((a, b) => a.order - b.order).slice(0, MAX_CAST);
  const status = options.status ?? "APPROVED";

  const movie = await prisma.movie.upsert({
    where: { tmdbId: details.id },
    update: {
      title: details.title,
      originalTitle: details.original_title,
      overview: details.overview,
      releaseDate: details.release_date ? new Date(details.release_date) : null,
      posterPath: details.poster_path,
      backdropPath: details.backdrop_path,
      runtime: details.runtime,
      director,
      country,
      tmdbPopularity: details.popularity,
      tmdbRating: details.vote_average,
      tagline,
      originalLanguage,
      studio,
      certification,
      revenue,
      collectionName,
      collectionTmdbId,
      lastSyncedAt: new Date(),
      status,
      genres: {
        connectOrCreate: details.genres.map((genre) => ({
          where: { tmdbId: genre.id },
          create: { tmdbId: genre.id, name: genre.name },
        })),
      },
    },
    create: {
      tmdbId: details.id,
      title: details.title,
      originalTitle: details.original_title,
      overview: details.overview,
      releaseDate: details.release_date ? new Date(details.release_date) : null,
      posterPath: details.poster_path,
      backdropPath: details.backdrop_path,
      runtime: details.runtime,
      director,
      country,
      tmdbPopularity: details.popularity,
      tmdbRating: details.vote_average,
      tagline,
      originalLanguage,
      studio,
      certification,
      revenue,
      collectionName,
      collectionTmdbId,
      status,
      submittedById: options.submittedById,
      genres: {
        connectOrCreate: details.genres.map((genre) => ({
          where: { tmdbId: genre.id },
          create: { tmdbId: genre.id, name: genre.name },
        })),
      },
    },
  });

  await prisma.castCredit.deleteMany({ where: { movieId: movie.id } });

  for (const castMember of topCast) {
    const person = await prisma.person.upsert({
      where: { tmdbId: castMember.id },
      update: { name: castMember.name, profilePath: castMember.profile_path },
      create: { tmdbId: castMember.id, name: castMember.name, profilePath: castMember.profile_path },
    });

    await prisma.castCredit.create({
      data: {
        movieId: movie.id,
        personId: person.id,
        characterName: castMember.character,
        order: castMember.order,
      },
    });
  }

  return movie;
}
