import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { tmdbImageUrl, getTmdbPersonDetails } from "@/lib/tmdb";
import { getRatingSummaries } from "@/lib/ratings";
import { MovieCard } from "@/components/movie-card";

export default async function PersonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const person = await prisma.person.findUnique({
    where: { id },
    include: {
      castCredits: {
        include: { movie: true },
        orderBy: { movie: { releaseDate: "desc" } },
      },
    },
  });

  if (!person) {
    notFound();
  }

  const bio = await getTmdbPersonDetails(person.tmdbId).catch(() => null);

  const movies = person.castCredits.map((credit) => credit.movie);
  const ratingSummaries = await getRatingSummaries(movies.map((m) => m.id));

  const profileUrl = tmdbImageUrl(person.profilePath, "w342");

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="flex flex-col gap-6 sm:flex-row">
        <div className="relative aspect-2/3 w-40 shrink-0 overflow-hidden rounded-md bg-neutral-800 sm:w-56">
          {profileUrl ? (
            <Image src={profileUrl} alt={person.name} fill sizes="224px" className="object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center px-2 text-center text-xs text-neutral-500">
              {person.name}
            </div>
          )}
        </div>

        <div className="flex-1">
          <h1 className="text-3xl font-bold text-white">{person.name}</h1>

          {bio && (
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-400">
              {bio.birthday && (
                <span>
                  Born {new Date(bio.birthday).toLocaleDateString(undefined, { dateStyle: "long" })}
                  {bio.deathday && ` — Died ${new Date(bio.deathday).toLocaleDateString(undefined, { dateStyle: "long" })}`}
                </span>
              )}
              {bio.place_of_birth && <span>{bio.place_of_birth}</span>}
            </div>
          )}

          {bio?.biography && <p className="mt-4 max-w-2xl whitespace-pre-line text-neutral-300">{bio.biography}</p>}
        </div>
      </div>

      {movies.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-xl font-bold text-white">Filmography</h2>
          <div className="flex flex-wrap gap-4">
            {movies.map((movie) => {
              const summary = ratingSummaries.get(movie.id);
              return (
                <MovieCard
                  key={movie.id}
                  movie={{
                    ...movie,
                    communityAverage: summary?.average ?? null,
                    communityCount: summary?.count ?? 0,
                  }}
                />
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
