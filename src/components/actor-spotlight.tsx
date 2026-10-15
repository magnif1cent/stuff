import Image from "next/image";
import Link from "next/link";
import type { ActorSpotlightData } from "@/lib/actor-spotlight";
import { tmdbImageUrl } from "@/lib/tmdb";
import { releaseYear } from "@/lib/format-date";
import { PlayIcon, YoutubeThumbnailImage } from "@/components/fight-scene-thumbnail";

function Headshot({ spotlight, className, sizes }: { spotlight: ActorSpotlightData; className: string; sizes: string }) {
  const url = tmdbImageUrl(spotlight.person.profilePath, "w342");
  return (
    <Link
      href={`/actors/${spotlight.person.id}`}
      aria-label={spotlight.person.name}
      className={`relative block shrink-0 overflow-hidden rounded-md bg-neutral-800 ${className}`}
    >
      {url && <Image src={url} alt="" fill unoptimized sizes={sizes} className="object-cover" />}
    </Link>
  );
}

function ProfileButton({ personId, className }: { personId: string; className: string }) {
  return (
    <Link
      href={`/actors/${personId}`}
      className={`min-h-11 items-center justify-center rounded-md bg-red-600 px-5 text-sm font-semibold text-white hover:bg-red-700 ${className}`}
    >
      View profile
    </Link>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">{children}</p>;
}

// One actor an admin picks for the week (see ActorSpotlightControl on the
// actor page). Every part but the name is optional and simply left out when
// the actor has no data for it, so a sparsely documented actor still gets a
// tidy card -- just a shorter one.
export function ActorSpotlight({ spotlight }: { spotlight: ActorSpotlightData }) {
  const { person, blurb, films, fightCount, funFact, fight, lineage } = spotlight;
  const counts = [
    films > 0 && `${films} ${films === 1 ? "film" : "films"} in the catalog`,
    fightCount > 0 && `${fightCount} ${fightCount === 1 ? "fight" : "fights"} tagged`,
  ].filter(Boolean);
  const sifuHref = lineage?.sifu
    ? lineage.sifu.personId
      ? `/actors/${lineage.sifu.personId}`
      : `/lineage/${lineage.sifu.id}`
    : null;

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="mb-4 flex items-baseline gap-3">
        <h2 className="font-serif text-xl font-bold text-white">Actor Spotlight</h2>
        <span className="text-xs font-semibold uppercase tracking-wider text-red-500">This week</span>
      </div>

      <article className="flex flex-col gap-4 rounded-lg border border-neutral-800 bg-neutral-900 p-4 lg:grid lg:grid-cols-[200px_minmax(0,1fr)_340px] lg:gap-8 lg:p-6">
        <Headshot spotlight={spotlight} className="hidden aspect-3/4 w-full lg:block" sizes="200px" />

        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex gap-4">
            <Headshot spotlight={spotlight} className="aspect-3/4 w-26 lg:hidden" sizes="104px" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-3">
                <Link
                  href={`/actors/${person.id}`}
                  className="font-display text-3xl uppercase leading-none tracking-wide text-white hover:text-red-400 lg:text-5xl"
                >
                  {person.name}
                </Link>
                {person.nativeName && (
                  <span className="font-native text-base text-neutral-400 lg:text-xl">{person.nativeName}</span>
                )}
              </div>
              {blurb && <p className="mt-2 text-sm text-neutral-300 lg:text-[15px]">{blurb}</p>}
              {counts.length > 0 && <p className="mt-1 text-xs text-neutral-500 lg:text-sm">{counts.join(" · ")}</p>}
            </div>
          </div>

          {funFact && (
            <div className="rounded-md bg-neutral-950 px-4 py-3">
              <Label>Did you know?</Label>
              <p className="mt-1 text-sm leading-relaxed text-neutral-300">{funFact}</p>
            </div>
          )}

          {lineage?.hasTree && (
            <p className="text-sm text-neutral-300">
              {lineage.sifu && sifuHref && (
                <>
                  Trained under{" "}
                  <Link href={sifuHref} className="text-red-500 hover:underline">
                    {lineage.sifu.name}
                  </Link>{" "}
                  ·{" "}
                </>
              )}
              <Link href={`/actors/${person.id}/lineage`} className="text-red-500 hover:underline">
                See the lineage →
              </Link>
            </p>
          )}

          <ProfileButton personId={person.id} className="mt-auto hidden self-start lg:flex" />
        </div>

        {fight && (
          <div className="flex flex-col gap-2">
            <Label>{fight.isSignature ? "Signature fight" : "Featured fight"}</Label>
            <Link
              href={`/movies/${fight.scene.movieId}/fights/${fight.scene.id}`}
              aria-label={fight.scene.title}
              className="group/thumb relative block aspect-video overflow-hidden rounded-md border border-neutral-700 bg-neutral-950"
            >
              <YoutubeThumbnailImage videoId={fight.scene.youtubeVideoId} title={fight.scene.title} textClassName="text-xs" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/10 text-white/90 transition group-hover/thumb:bg-black/30">
                <PlayIcon className="h-10 w-10" />
              </div>
            </Link>
            <div>
              <Link
                href={`/movies/${fight.scene.movieId}/fights/${fight.scene.id}`}
                className="block truncate text-[15px] font-medium text-neutral-100 hover:text-red-500"
              >
                {fight.scene.title}
              </Link>
              <p className="truncate text-xs text-neutral-500">
                {fight.scene.movie.title}
                {releaseYear(fight.scene.movie.releaseDate) && ` · ${releaseYear(fight.scene.movie.releaseDate)}`}
              </p>
            </div>
          </div>
        )}

        {/* On phones the button goes last, after the fight, instead of
            between the actor's details and the fight. */}
        <ProfileButton personId={person.id} className="flex lg:hidden" />
      </article>
    </section>
  );
}
