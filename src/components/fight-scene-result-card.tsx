import Link from "next/link";
import type { FightScene, FightSceneTag, Movie } from "@/generated/prisma/client";
import { AddToListControl, type AddToListItem } from "@/components/add-to-list-control";
import { FavoriteButton } from "@/components/favorite-button";

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
      <div className="flex items-center justify-between gap-2 text-[10px] tracking-wider uppercase" style={{ color: TICKET_MUTED }}>
        <Link href={`/movies/${scene.movieId}`} className="truncate hover:opacity-70">
          {scene.movie.title} {year && `(${year})`}
        </Link>
        <div className="flex shrink-0 items-center gap-1.5">
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

      <div className="mt-3 border-t-2 border-dashed pt-3" style={{ borderColor: "#b8ab8c" }}>
        <Link
          href={permalink}
          className="mx-auto block aspect-video w-2/3 max-w-[180px] overflow-hidden border-[3px] bg-cover bg-center"
          style={{
            borderColor: TICKET_INK,
            backgroundColor: TICKET_INK,
            backgroundImage: `url(https://img.youtube.com/vi/${scene.youtubeVideoId}/hqdefault.jpg)`,
          }}
        />
      </div>

      <Link href={permalink} className="mt-3 block truncate text-lg font-bold hover:opacity-70" style={{ fontFamily: "Georgia, serif" }}>
        {scene.title}
      </Link>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {scene.tags.map((tag) => (
          <Link
            key={tag.id}
            href={`/search/fight-scenes?tag=${encodeURIComponent(tag.name)}`}
            className="border px-2 py-0.5 text-[10px] tracking-wide uppercase hover:opacity-70"
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

      <div className="mt-4 flex justify-end gap-3">
        <div className="text-center">
          <div
            className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border-2 text-base font-bold"
            style={{ borderColor: TICKET_STAMP, color: TICKET_STAMP, transform: "rotate(-8deg)" }}
          >
            {memberLabel}
          </div>
          <p className="text-[8.5px] tracking-wide uppercase" style={{ color: TICKET_MUTED }}>
            Member ({scene.memberRatingCount})
          </p>
        </div>
        {scene.editorRatingCount > 0 && (
          <div className="text-center">
            <div
              className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border-2 text-base font-bold"
              style={{ borderColor: TICKET_STAMP, color: TICKET_STAMP, transform: "rotate(6deg)" }}
            >
              {scene.editorRatingAverage?.toFixed(1)}
            </div>
            <p className="text-[8.5px] tracking-wide uppercase" style={{ color: TICKET_MUTED }}>
              Editors&rsquo;
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
