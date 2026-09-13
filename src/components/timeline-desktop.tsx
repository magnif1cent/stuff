import Link from "next/link";
import Image from "next/image";
import { resolvePosterUrl, isTmdbUrl } from "@/lib/tmdb";
import {
  computeDotLayout,
  computeScaleTicks,
  overflowBadgeBottom,
  TIMELINE_AXIS_WIDTH,
  TIMELINE_ERA_LAYOUT,
  AXIS_BREAK_PX,
  AXIS_BASELINE_PX,
  type TimelineEraData,
} from "@/lib/timeline";

// Reserved below AXIS_BASELINE_PX for the era name/years label; the scale-
// tick ruler gets whatever's left under that, down to the plot's own floor.
const ERA_LABEL_HEIGHT = 26;

// Headroom above the baseline for the tallest dot stack plus its hover
// tooltip -- verified once (see DECISIONS.md) at 434px above whatever the
// baseline's own position is, so the plot's total height is derived from
// that same 434px rather than a second, independently hand-picked number
// that could drift from it.
const PLOT_HEIGHT_ABOVE_BASELINE = 434;

// Pure CSS hover (Tailwind's group/group-hover) — no client JS needed for
// the tooltip. Each dot's hit area is 24px even though the painted dot is
// 8px, per the usual "hit target bigger than the mark" rule for dense
// scatter marks.
export function TimelineDesktop({ eras }: { eras: TimelineEraData[] }) {
  const layoutByKey = new Map(TIMELINE_ERA_LAYOUT.map((e) => [e.key, e]));
  const scaleTicks = computeScaleTicks();

  return (
    <div className="rail-scrollbar relative mt-8 overflow-x-auto overflow-y-hidden pb-5 pl-4 sm:pl-6 lg:pl-10">
      <div className="relative" style={{ width: TIMELINE_AXIS_WIDTH, height: PLOT_HEIGHT_ABOVE_BASELINE + AXIS_BASELINE_PX }}>
        {/* axis-break: the scale changes here, marked rather than hidden */}
        <div
          className="absolute top-0"
          style={{
            left: AXIS_BREAK_PX,
            bottom: AXIS_BASELINE_PX,
            width: 12,
            background: "repeating-linear-gradient(-55deg, var(--color-neutral-950) 0 3px, var(--color-neutral-900) 3px 6px)",
          }}
        />

        {/* one continuous axis line under every band */}
        <div className="absolute right-0 left-0 h-0.5 bg-neutral-700" style={{ bottom: AXIS_BASELINE_PX }} />

        {/* A constant-interval (10-year) tick ruler below the axis, Qing
            onward -- everything before it already sits at one roughly-
            consistent px/year rate (see TIMELINE_ERA_LAYOUT's own comment),
            so there's no scale change to show there. Since the interval
            never changes, tick DENSITY does the explaining: packed together
            before the break, spread apart after it -- no note to read or
            miss. */}
        {scaleTicks.map((tick) => (
          <div key={tick.year} className="absolute" style={{ left: tick.left, bottom: 10 }}>
            <div
              className="absolute bottom-0 left-1/2 w-px -translate-x-1/2 bg-neutral-700"
              style={{ height: tick.labeled ? 8 : 4 }}
            />
            {tick.labeled && (
              <p className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 text-[9px] whitespace-nowrap text-neutral-600">
                {tick.year}
              </p>
            )}
          </div>
        ))}

        {eras.map((era) => {
          const layout = layoutByKey.get(era.key);
          if (!layout) return null;
          const width = layout.px1 - layout.px0;
          const dots = computeDotLayout(layout, era.movies);
          const overflow = era.totalCount > era.movies.length;

          return (
            <div key={era.key}>
              <div
                className="absolute text-center"
                style={{
                  left: layout.px0 + width / 2,
                  bottom: AXIS_BASELINE_PX - ERA_LABEL_HEIGHT,
                  width: 150,
                  transform: "translateX(-50%)",
                }}
              >
                <p className="truncate text-xs font-semibold text-neutral-300">{era.name}</p>
                <p className="mt-0.5 text-[10px] text-neutral-600">{era.years}</p>
              </div>

              {dots.map((dot) => {
                const posterUrl = resolvePosterUrl(dot.movie);
                return (
                  <Link
                    key={dot.movie.id}
                    href={`/movies/${dot.movie.id}`}
                    className="group absolute flex h-6 w-6 items-center justify-center"
                    style={{ left: dot.left, bottom: dot.bottom }}
                  >
                    <span className="h-2 w-2 rounded-full bg-amber-500 shadow-[0_0_0_2px_var(--color-neutral-950)] transition group-hover:scale-150 group-hover:bg-amber-400" />
                    <div
                      className="pointer-events-none absolute bottom-full left-1/2 z-10 -translate-x-1/2 -translate-y-2 rounded-md border border-neutral-700 bg-neutral-900 p-2 opacity-0 shadow-lg transition group-hover:opacity-100"
                      style={{ width: 128 }}
                    >
                      {/* a plain <span> here ignores width/aspect-ratio (both
                          are no-ops on inline elements), which is why the
                          poster wasn't rendering -- needs a block-level box
                          for next/image's `fill` to have anything to fill */}
                      <div className="relative aspect-2/3 w-28 overflow-hidden rounded bg-neutral-800">
                        {posterUrl && (
                          <Image
                            src={posterUrl}
                            alt=""
                            fill
                            unoptimized={isTmdbUrl(posterUrl)}
                            sizes="112px"
                            className="object-cover"
                          />
                        )}
                      </div>
                      <div className="mt-2">
                        <p className="line-clamp-2 font-display text-xs tracking-wide text-neutral-100">{dot.movie.title}</p>
                        <p className="mt-1 text-[11px] text-neutral-500">
                          {era.name}
                          {dot.movie.releaseDate ? ` · ${dot.movie.releaseDate.getFullYear()}` : ""}
                        </p>
                        {dot.movie.ratingAverage != null && (
                          <p className="mt-0.5 text-[11px] font-semibold text-yellow-500">
                            ★ {dot.movie.ratingAverage.toFixed(1)}
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}

              {overflow && (
                <Link
                  href={`/timeline/${era.key}`}
                  className="absolute -translate-x-1/2 rounded-full border border-dashed border-neutral-700 bg-neutral-900 px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap text-red-400 hover:border-red-600 hover:text-red-300"
                  style={{ left: layout.px0 + width / 2, bottom: overflowBadgeBottom(layout, dots.length) }}
                >
                  +{era.totalCount - era.movies.length} more · View all →
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
