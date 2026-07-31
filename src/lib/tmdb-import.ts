import { prisma } from "@/lib/prisma";
import { getTmdbMovieDetails } from "@/lib/tmdb";

const MAX_CAST = 15;

export async function importMovieFromTmdb(tmdbId: number) {
  const details = await getTmdbMovieDetails(tmdbId);
  const director = details.credits.crew.find((c) => c.job === "Director")?.name ?? null;
  const country = details.production_countries[0]?.name ?? null;
  const topCast = [...details.credits.cast].sort((a, b) => a.order - b.order).slice(0, MAX_CAST);

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
      lastSyncedAt: new Date(),
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
