import Link from "next/link";
import type { FightScene, Movie } from "@/generated/prisma/client";
import { RailScroller } from "@/components/movie-rail";
import { SectionHeading } from "@/components/section-heading";
import { PlayIcon, YoutubeThumbnailImage } from "@/components/fight-scene-thumbnail";
import { releaseYear } from "@/lib/format-date";

export type FightRailItem = Pick<FightScene, "id" | "movieId" | "title" | "youtubeVideoId"> & {
  movie: Pick<Movie, "title" | "releaseDate">;
  // Whichever score the rail is ranked by (member or editor average); the
  // section title says which.
  average: number | null;
  // Member rating count; omitted when ranked by the Editors' rating.
  count?: number;
};

function FightRailCard({ fight, rank }: { fight: FightRailItem; rank: number }) {
  const permalink = `/movies/${fight.movieId}/fights/${fight.id}`;
  const year = releaseYear(fight.movie.releaseDate);

  return (
    <article className="w-72 shrink-0 sm:w-[22rem]">
      {/* The rank numeral sits beside the thumbnail link, not inside it: the
          link clips to its rounded corners, and the numeral hangs past its
          bottom-left edge -- the same hollow, red-for-top-3 numeral as the
          /tops/movies chart. */}
      <div className="relative">
        <Link
          href={permalink}
          aria-label={fight.title}
          className="group/thumb relative block aspect-video overflow-hidden rounded-md border border-neutral-700 bg-neutral-900"
        >
          <YoutubeThumbnailImage videoId={fight.youtubeVideoId} title={fight.title} textClassName="text-xs" />
          <div className="absolute inset-0 flex items-center justify-center bg-black/10 text-white/90 transition group-hover/thumb:bg-black/30">
            <PlayIcon className="h-10 w-10" />
          </div>
        </Link>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-3 left-1 font-display text-6xl leading-none text-neutral-950 sm:text-7xl"
          style={{ WebkitTextStroke: `1.5px ${rank <= 3 ? "#ef4444" : "#f5f5f5"}` }}
        >
          {rank}
        </span>
      </div>
      <div className="mt-4 pl-1">
        <Link href={permalink} className="block truncate text-[15px] font-medium text-neutral-100 hover:text-red-500">
          <span className="sr-only">#{rank} </span>
          {fight.title}
        </Link>
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <Link href={`/movies/${fight.movieId}`} className="min-w-0 truncate hover:text-red-400">
            {fight.movie.title}
            {year && ` · ${year}`}
          </Link>
          {fight.average != null && (
            <span className="shrink-0 text-yellow-500">
              ★ {fight.average.toFixed(1)}
              {fight.count ? ` (${fight.count})` : ""}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

export function FightRail({
  title,
  seeAllHref,
  fights,
}: {
  title: string;
  seeAllHref: string;
  fights: FightRailItem[];
}) {
  // Unlike the movie rails, no "nothing here yet" message: a brand-new
  // section that's empty is just noise on the homepage.
  if (fights.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8">
      <SectionHeading title={title} seeAllHref={seeAllHref} />
      <RailScroller gapClassName="gap-5">
        {fights.map((fight, i) => (
          <FightRailCard key={fight.id} fight={fight} rank={i + 1} />
        ))}
      </RailScroller>
    </section>
  );
}
