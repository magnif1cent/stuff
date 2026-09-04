import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { tmdbImageUrl, resolvePosterUrl, isTmdbUrl } from "@/lib/tmdb";
import { getSharedCollaborations } from "@/lib/collaborators";

async function getPeople(personId: string, otherPersonId: string) {
  const people = await prisma.person.findMany({
    where: { id: { in: [personId, otherPersonId] } },
    select: { id: true, name: true, profilePath: true },
  });
  return {
    person: people.find((p) => p.id === personId),
    other: people.find((p) => p.id === otherPersonId),
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ personId: string; otherPersonId: string }>;
}): Promise<Metadata> {
  const { personId, otherPersonId } = await params;
  const { person, other } = await getPeople(personId, otherPersonId);
  if (!person || !other) return {};

  const title = `${person.name} & ${other.name}`;
  const description = `Movies and fight scenes ${person.name} and ${other.name} share, on Kung Fu Sauce.`;
  return { title, description };
}

export default async function CollaboratorsWithPage({
  params,
}: {
  params: Promise<{ personId: string; otherPersonId: string }>;
}) {
  const { personId, otherPersonId } = await params;
  if (personId === otherPersonId) notFound();

  const { person, other } = await getPeople(personId, otherPersonId);
  if (!person || !other) notFound();

  const { movies, fightScenes } = await getSharedCollaborations(personId, otherPersonId);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="mb-10 flex items-center justify-center gap-6 text-center">
        <PersonBadge person={person} />
        <span className="text-sm font-semibold text-neutral-500">&amp;</span>
        <PersonBadge person={other} />
      </div>

      <h2 className="mb-3 text-lg font-bold text-white">
        Shared Movies{movies.length > 0 && ` (${movies.length})`}
      </h2>
      {movies.length === 0 ? (
        <p className="mb-8 text-sm text-neutral-400">No shared movies in the catalog.</p>
      ) : (
        <div className="mb-8 flex flex-col border-t border-neutral-800">
          {movies.map((movie) => {
            const posterUrl = resolvePosterUrl(movie, "w200");
            const caption = [
              movie.characterNameA && `${person.name} as ${movie.characterNameA}`,
              movie.characterNameB && `${other.name} as ${movie.characterNameB}`,
            ]
              .filter(Boolean)
              .join(" · ");
            return (
              <div key={movie.id} className="flex items-center gap-3 border-b border-neutral-800 py-2">
                <Link
                  href={`/movies/${movie.id}`}
                  className="relative h-16 w-11 shrink-0 overflow-hidden rounded bg-neutral-800"
                >
                  {posterUrl && (
                    <Image
                      src={posterUrl}
                      alt={movie.title}
                      fill
                      unoptimized={isTmdbUrl(posterUrl)}
                      sizes="44px"
                      className="object-cover"
                    />
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/movies/${movie.id}`}
                    className="block truncate text-sm font-medium text-neutral-100 hover:text-red-500"
                  >
                    {movie.title}
                  </Link>
                  {caption && <p className="truncate text-xs text-neutral-500">{caption}</p>}
                </div>
                <span className="shrink-0 text-xs text-neutral-500 tabular-nums">
                  {movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : ""}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <h2 className="mb-3 text-lg font-bold text-white">
        Shared Fight Scenes{fightScenes.length > 0 && ` (${fightScenes.length})`}
      </h2>
      {fightScenes.length === 0 ? (
        <p className="text-sm text-neutral-400">No shared fight scenes tagged yet.</p>
      ) : (
        <div className="flex flex-col border-t border-neutral-800">
          {fightScenes.map((scene) => (
            <div
              key={scene.id}
              className="flex items-center justify-between gap-3 border-b border-neutral-800 py-2"
            >
              <Link
                href={`/movies/${scene.movieId}/fights/${scene.id}`}
                className="truncate text-sm font-medium text-neutral-100 hover:text-red-500"
              >
                {scene.title}
              </Link>
              <span className="shrink-0 text-xs text-neutral-500">from {scene.movieTitle}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PersonBadge({ person }: { person: { id: string; name: string; profilePath: string | null } }) {
  return (
    <Link href={`/actors/${person.id}`} className="group flex flex-col items-center gap-2">
      <div className="relative h-16 w-16 overflow-hidden rounded-full bg-neutral-800">
        {person.profilePath && (
          <Image
            src={tmdbImageUrl(person.profilePath, "w200") ?? ""}
            alt={person.name}
            fill
            unoptimized
            sizes="64px"
            className="object-cover"
          />
        )}
      </div>
      <span className="text-base font-bold text-white group-hover:text-red-500">{person.name}</span>
    </Link>
  );
}
