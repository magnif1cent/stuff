import type { ReactNode } from "react";
import Link from "next/link";
import type { FightScene, FightSceneTag, FightSceneStyle, FightSceneMove, Movie, Person } from "@/generated/prisma/client";
import { AddToListControl, type AddToListItem } from "@/components/add-to-list-control";
import { FavoriteButton } from "@/components/favorite-button";
import { FightSceneThumbnail } from "@/components/fight-scene-thumbnail";

// How many cast names to spell out before collapsing the rest into "& N
// more" — keeps the cast line (and so the card's height) consistent
// across scenes with wildly different cast-tag counts.
const MAX_FEATURED_CAST = 2;

// Same "Fight Ticket" palette as fight-scene-section.tsx — kept in sync
// manually since this is a read-only result card, not the interactive one.
const TICKET_INK = "#1a1712";
const TICKET_MUTED = "#6b6148";
const TICKET_STAMP = "#a4291e";
const TICKET_MOVE = "#4a5a3a";

export type FightSceneResult = Pick<
  FightScene,
  "id" | "movieId" | "title" | "youtubeVideoId" | "isVerified"
> & {
  movie: Pick<Movie, "id" | "title" | "releaseDate">;
  tags: Pick<FightSceneTag, "id" | "name">[];
  // Optional so existing call sites that haven't been wired to fetch these
  // yet (lists, tops, member profiles — see DECISIONS.md) keep type-checking
  // without a badge row rather than being forced to fetch them just to
  // satisfy this type.
  styles?: Pick<FightSceneStyle, "id" | "name">[];
  moves?: Pick<FightSceneMove, "id" | "name">[];
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
  size = "default",
  thumbnailBadge,
}: {
  scene: FightSceneResult;
  initialLists?: AddToListItem[];
  signedIn?: boolean;
  initialFavorite?: boolean;
  // "compact" mirrors MovieCard's own compact size (same ~w-28/w-32
  // footprint) for the same reason: a profile page can show several lists'
  // worth of cards behind tabs, where the full "Fight Ticket" card (cast,
  // tags, verified badge, favorite/save actions) is more than a preview
  // needs. Keeps the cream ticket identity, drops everything but the
  // thumbnail, title, and rating.
  size?: "default" | "compact";
  // Extra control pinned to the thumbnail's top-left corner (the actor
  // page's signature-vote button), opposite the favorite/save buttons.
  thumbnailBadge?: ReactNode;
}) {
  const year = scene.movie.releaseDate ? new Date(scene.movie.releaseDate).getFullYear() : null;
  const permalink = `/movies/${scene.movieId}/fights/${scene.id}`;
  const memberLabel = scene.memberRatingAverage ? scene.memberRatingAverage.toFixed(1) : "—";

  if (size === "compact") {
    return (
      <div
        className="relative w-28 shrink-0 bg-[#e8dcc4] p-2 font-mono sm:w-32"
        style={{
          color: TICKET_INK,
          clipPath:
            "polygon(0 6px, 6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px))",
        }}
      >
        <FightSceneThumbnail href={permalink} videoId={scene.youtubeVideoId} title={scene.title} inkColor={TICKET_INK} />
        <Link
          href={permalink}
          title={scene.title}
          className="mt-2 block truncate text-xs font-bold hover:opacity-70"
          style={{ fontFamily: "Georgia, serif" }}
        >
          {scene.title}
        </Link>
        <p className="truncate text-[10px]" style={{ color: TICKET_MUTED }}>
          {scene.memberRatingCount > 0 ? (
            <>
              <span className="font-bold" style={{ color: TICKET_STAMP }}>
                ★ {memberLabel}
              </span>{" "}
              ({scene.memberRatingCount})
            </>
          ) : (
            "No ratings yet"
          )}
        </p>
      </div>
    );
  }

  return (
    <div
      // Full width of its grid cell on phones (the grids go two-up there),
      // fixed ticket width from sm up.
      className="relative w-full min-w-0 bg-[#e8dcc4] p-3 font-mono sm:w-64 sm:shrink-0 sm:p-4"
      style={{
        color: TICKET_INK,
        clipPath:
          "polygon(0 10px, 10px 0, calc(100% - 10px) 0, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0 calc(100% - 10px))",
      }}
    >
      <Link
        href={`/movies/${scene.movieId}`}
        title={`${scene.movie.title}${year ? ` (${year})` : ""}`}
        className="flex items-baseline gap-1 text-[11px] font-bold tracking-wide uppercase hover:opacity-70 sm:text-sm"
      >
        <span className="min-w-0 truncate">{scene.movie.title}</span>
        {year && (
          <span className="shrink-0 font-normal" style={{ color: TICKET_MUTED }}>
            ({year})
          </span>
        )}
      </Link>

      {/* Favorite/save sit on the thumbnail as siblings of its link (not
          inside it) so they aren't nested interactive elements. */}
      <div className="relative mt-2 sm:mt-3">
        <FightSceneThumbnail
          href={permalink}
          videoId={scene.youtubeVideoId}
          title={scene.title}
          inkColor={TICKET_INK}
          fullWidth
        />
        {/* Rating sits on the thumbnail rather than in the header so it
            doesn't squeeze the movie title, especially two-up on phones.
            Hidden until a scene has at least one rating. */}
        {scene.memberRatingCount > 0 && (
          <span
            title={`${scene.memberRatingCount} member rating${scene.memberRatingCount === 1 ? "" : "s"}`}
            className="pointer-events-none absolute bottom-1.5 left-1.5 rounded-full bg-black/70 px-2 py-0.5 text-[10px] text-white sm:bottom-2 sm:left-2 sm:text-xs"
          >
            <span className="font-bold">★ {memberLabel}</span> <span className="text-white/70">({scene.memberRatingCount})</span>
          </span>
        )}
        {thumbnailBadge && <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2">{thumbnailBadge}</div>}
        <div className="absolute top-1.5 right-1.5 flex items-center gap-1 sm:top-2 sm:right-2 sm:gap-1.5">
          <FavoriteButton
            movieId={scene.movieId}
            fightSceneId={scene.id}
            initialFavorite={initialFavorite}
            signedIn={signedIn}
            variant="overlay"
          />
          <AddToListControl
            target={{ type: "fightScene", id: scene.id }}
            initialLists={initialLists}
            signedIn={signedIn}
            variant="overlay"
          />
        </div>
      </div>

      <div className="mt-2 flex items-center gap-1.5 sm:mt-3">
        <Link
          href={permalink}
          title={scene.title}
          className="min-w-0 truncate text-sm font-bold hover:opacity-70 sm:text-lg"
          style={{ fontFamily: "Georgia, serif" }}
        >
          {scene.title}
        </Link>
        {/* A small check next to the title instead of a "Verified" pill in
            the tag row — nearly every scene is verified, so the pill spent a
            lot of room saying little. */}
        {scene.isVerified && (
          <span
            title="Verified"
            aria-label="Verified"
            className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-[9px] leading-none sm:h-4 sm:w-4 sm:text-[10px]"
            style={{ background: TICKET_INK, color: "#e8dcc4" }}
          >
            ✓
          </span>
        )}
      </div>
      {scene.cast.length > 0 && (
        <p className="mt-0.5 truncate text-[10px] tracking-wide uppercase sm:text-[11px]" style={{ color: TICKET_MUTED }}>
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

      {((scene.styles?.length ?? 0) > 0 || (scene.moves?.length ?? 0) > 0) && (
        <div className="mt-2 flex flex-wrap gap-1 sm:mt-3 sm:gap-1.5">
          {scene.styles?.map((style) => (
            <span
              key={style.id}
              className="px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase"
              style={{ border: `1px solid ${TICKET_STAMP}`, color: TICKET_STAMP }}
            >
              {style.name}
            </span>
          ))}
          {scene.moves?.map((move) => (
            <span
              key={move.id}
              className="px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase"
              style={{ border: `1px solid ${TICKET_MOVE}`, color: TICKET_MOVE }}
            >
              {move.name}
            </span>
          ))}
        </div>
      )}

      {scene.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1 sm:mt-3 sm:gap-1.5">
          {scene.tags.map((tag) => (
            <Link
              key={tag.id}
              href={`/search/fights?tag=${encodeURIComponent(tag.name)}`}
              className="border px-1.5 py-0.5 text-[9px] tracking-wide uppercase underline underline-offset-2 hover:opacity-70 sm:px-2 sm:text-[10px]"
              style={{ borderColor: TICKET_INK }}
            >
              {tag.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
