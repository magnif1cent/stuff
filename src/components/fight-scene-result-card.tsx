import Link from "next/link";
import type { FightScene, FightSceneTag, Movie, Person } from "@/generated/prisma/client";
import { AddToListControl, type AddToListItem } from "@/components/add-to-list-control";
import { FavoriteButton } from "@/components/favorite-button";
import { FightSceneThumbnail } from "@/components/fight-scene-thumbnail";

// How many cast names to spell out before collapsing the rest into "& N
// more" — keeps the "Featuring" line (and so the card's height) consistent
// across scenes with wildly different cast-tag counts.
const MAX_FEATURED_CAST = 2;

// Same "Fight Ticket" palette as fight-scene-section.tsx — kept in sync
// manually since this is a read-only result card, not the interactive one.
const TICKET_INK = "#1a1712";
const TICKET_MUTED = "#6b6148";
const TICKET_STAMP = "#a4291e";

export type FightSceneResult = Pick<
  FightScene,
  "id" | "movieId" | "title" | "youtubeVideoId" | "isVerified"
> & {
  movie: Pick<Movie, "id" | "title" | "releaseDate">;
  tags: Pick<FightSceneTag, "id" | "name">[];
  cast: { id: string; person: Pick<Person, "id" | "name"> }[];
  memberRatingAverage: number | null;
  memberRatingCount: number;
  editorRatingAverage: number | null;
  editorRatingCount: number;
};

export function FightSceneResultCard({
  scene,
  initialLists = [],
  signedIn = false,
  initialFavorite = false,
}: {
  scene: FightSceneResult;
  initialLists?: AddToListItem[];
  signedIn?: boolean;
  initialFavorite?: boolean;
}) {
  const year = scene.movie.releaseDate ? new Date(scene.movie.releaseDate).getFullYear() : null;
  const permalink = `/movies/${scene.movieId}/fight-scenes/${scene.id}`;
  const memberLabel = scene.memberRatingAverage ? scene.memberRatingAverage.toFixed(1) : "—";

  return (
    <div
      className="relative w-64 shrink-0 bg-[#e8dcc4] p-4 font-mono"
      style={{
        color: TICKET_INK,
        clipPath:
          "polygon(0 10px, 10px 0, calc(100% - 10px) 0, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0 calc(100% - 10px))",
      }}
    >
      <Link
        href={`/movies/${scene.movieId}`}
        title={`${scene.movie.title}${year ? ` (${year})` : ""}`}
        className="flex items-baseline gap-1 text-sm font-bold tracking-wide uppercase hover:opacity-70"
      >
        <span className="min-w-0 truncate">{scene.movie.title}</span>
        {year && (
          <span className="shrink-0 font-normal" style={{ color: TICKET_MUTED }}>
            ({year})
          </span>
        )}
      </Link>

      <div className="mt-3 border-t-2 border-dashed pt-3" style={{ borderColor: "#b8ab8c" }}>
        <FightSceneThumbnail
          href={permalink}
          videoId={scene.youtubeVideoId}
          title={scene.title}
          inkColor={TICKET_INK}
        />
      </div>

      <Link href={permalink} className="mt-3 block truncate text-lg font-bold hover:opacity-70" style={{ fontFamily: "Georgia, serif" }}>
        {scene.title}
      </Link>
      {scene.cast.length > 0 && (
        <p className="mt-0.5 truncate text-[11px] tracking-wide uppercase" style={{ color: TICKET_MUTED }}>
          Featuring{" "}
          {scene.cast.slice(0, MAX_FEATURED_CAST).map((c, i) => (
            <span key={c.person.id}>
              {i > 0 && ", "}
              <Link href={`/actors/${c.person.id}`} className="hover:underline">
                {c.person.name}
              </Link>
            </span>
          ))}
          {scene.cast.length > MAX_FEATURED_CAST && ` & ${scene.cast.length - MAX_FEATURED_CAST} more`}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {scene.tags.map((tag) => (
          <Link
            key={tag.id}
            href={`/search/fight-scenes?tag=${encodeURIComponent(tag.name)}`}
            className="border px-2 py-0.5 text-[10px] tracking-wide uppercase underline underline-offset-2 hover:opacity-70"
            style={{ borderColor: TICKET_INK }}
          >
            {tag.name}
          </Link>
        ))}
        {scene.isVerified && (
          <span className="px-2 py-0.5 text-[10px] tracking-wide uppercase" style={{ background: TICKET_INK, color: "#e8dcc4" }}>
            ✓ Verified
          </span>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t pt-3" style={{ borderColor: "#b8ab8c" }}>
        <p className="text-sm">
          <span className="font-bold" style={{ color: TICKET_STAMP }}>
            ★ {memberLabel}
          </span>{" "}
          <span className="text-xs" style={{ color: TICKET_MUTED }}>
            ({scene.memberRatingCount})
          </span>
        </p>
        <div className="flex shrink-0 items-center gap-3">
          <FavoriteButton
            movieId={scene.movieId}
            fightSceneId={scene.id}
            initialFavorite={initialFavorite}
            signedIn={signedIn}
          />
          <AddToListControl
            target={{ type: "fightScene", id: scene.id }}
            initialLists={initialLists}
            signedIn={signedIn}
            variant="icon"
          />
        </div>
      </div>
    </div>
  );
}
