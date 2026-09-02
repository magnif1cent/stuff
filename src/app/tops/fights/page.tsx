import type { Metadata } from "next";
import Link from "next/link";
import { getTopRatedFightScenes } from "@/lib/fight-scenes";
import { YoutubeThumbnailImage } from "@/components/fight-scene-thumbnail";

export const metadata: Metadata = {
  title: "Top 100 Fights",
  description: "The 100 highest community-rated fight scenes in the catalog.",
};

const TOP_FIGHTS_LIMIT = 100;

// Same "Fight Ticket" palette as fight-scene-result-card.tsx and
// fight-scene-section.tsx — kept in sync manually, per those files' own
// comments, rather than shared constants.
const TICKET = "#e8dcc4";
const TICKET_INK = "#1a1712";
const TICKET_MUTED = "#6b6148";
const TICKET_STAMP = "#a4291e";

export default async function TopFightsPage() {
  const fights = await getTopRatedFightScenes(TOP_FIGHTS_LIMIT);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <p className="mb-1 font-cond text-xs font-semibold tracking-widest text-red-500 uppercase">Tops</p>
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-display text-3xl font-normal tracking-wide text-white">Top 100 Fights</h1>
        <Link href="/tops/movies" className="text-sm text-red-500 hover:underline">
          Top 100 Movies →
        </Link>
      </div>
      <p className="mb-8 max-w-2xl text-sm text-neutral-400">
        Ranked by average community rating (at least 2 ratings to qualify).
      </p>

      {fights.length === 0 ? (
        <p className="text-neutral-400">No community ratings yet — be the first to rate a fight scene.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {fights.map((scene, index) => {
            const isTop3 = index < 3;
            return (
              <Link
                key={scene.id}
                href={`/movies/${scene.movieId}/fights/${scene.id}`}
                className="relative block font-mono"
                style={{
                  background: TICKET,
                  color: TICKET_INK,
                  padding: "10px 10px 12px",
                  clipPath:
                    "polygon(0 8px, 8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px))",
                }}
              >
                <span
                  className="absolute -top-2 -right-1.5 z-10 rounded px-1.5 py-0.5 font-mono text-xs font-bold shadow"
                  style={{
                    background: isTop3 ? TICKET_STAMP : TICKET_INK,
                    color: TICKET,
                    transform: "rotate(4deg)",
                  }}
                >
                  #{index + 1}
                </span>
                <div
                  className="relative aspect-video overflow-hidden rounded-sm border-2"
                  style={{ borderColor: TICKET_INK, background: "#000" }}
                >
                  <YoutubeThumbnailImage videoId={scene.youtubeVideoId} title={scene.title} textClassName="text-[10px]" />
                </div>
                <p className="mt-2 truncate font-editorial text-sm font-bold" style={{ color: TICKET_INK }}>
                  {scene.title}
                </p>
                <p className="truncate text-[10px] tracking-wide uppercase" style={{ color: TICKET_MUTED }}>
                  {scene.movie.title}
                </p>
                {scene.communityAverage != null && (
                  <p className="mt-1.5 text-xs">
                    <span className="font-bold" style={{ color: TICKET_STAMP }}>
                      ★ {scene.communityAverage.toFixed(1)}
                    </span>{" "}
                    <span style={{ color: TICKET_MUTED }}>({scene.communityCount})</span>
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
