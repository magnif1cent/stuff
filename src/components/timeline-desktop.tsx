"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  type EraSettingKey,
} from "@/lib/timeline-layout";

// Reserved below AXIS_BASELINE_PX for the era name/years label; the scale-
// tick ruler gets whatever's left under that, down to the plot's own floor.
const ERA_LABEL_HEIGHT = 26;

// Headroom above the baseline for the tallest dot stack plus its hover
// tooltip -- verified once (see DECISIONS.md) at 434px above whatever the
// baseline's own position is, so the plot's total height is derived from
// that same 434px rather than a second, independently hand-picked number
// that could drift from it.
const PLOT_HEIGHT_ABOVE_BASELINE = 434;

// How far into a band a chip/minimap jump lands, so the target era isn't
// flush against the scroller's left edge (which also has its own
// pl-4/sm:pl-6/lg:pl-10 padding this deliberately doesn't try to match
// exactly -- a little slack either way is harmless for a "jump near here"
// gesture).
const JUMP_LEFT_MARGIN = 32;

// Minimum community rating a movie needs to count as "matching" the active
// filter -- 0 means no filter. Kept to rating only (not genre/verified,
// like the mockup's illustrative pills) because rating is the one facet
// getTimelineOverview already fetches per movie; the others would need the
// query itself to start joining that data.
const RATING_FILTER_OPTIONS = [0, 3, 4] as const;

// Pure CSS hover (Tailwind's group/group-hover) — no client JS needed for
// the tooltip. Each dot's hit area is 24px even though the painted dot is
// 8px, per the usual "hit target bigger than the mark" rule for dense
// scatter marks.
export function TimelineDesktop({ eras }: { eras: TimelineEraData[] }) {
  const layoutByKey = useMemo(() => new Map(TIMELINE_ERA_LAYOUT.map((e) => [e.key, e])), []);
  const scaleTicks = useMemo(() => computeScaleTicks(), []);

  const scrollRef = useRef<HTMLDivElement>(null);
  const minimapTrackRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ left: 0, width: 0 });
  const [activeKey, setActiveKey] = useState<EraSettingKey | null>(null);
  const [minRating, setMinRating] = useState<(typeof RATING_FILTER_OPTIONS)[number]>(0);

  // Keeps the minimap's viewport box and the active chip in sync with
  // actual scroll position -- both derived from the same scroll/resize
  // handler rather than two separate listeners drifting out of step.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    function update() {
      setViewport({ left: el!.scrollLeft, width: el!.clientWidth });
      const x = el!.scrollLeft + JUMP_LEFT_MARGIN;
      const era = TIMELINE_ERA_LAYOUT.find((e) => x >= e.px0 && x < e.px1) ?? TIMELINE_ERA_LAYOUT[0];
      setActiveKey(era.key);
    }
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  function jumpTo(key: EraSettingKey) {
    const layout = layoutByKey.get(key);
    if (!layout || !scrollRef.current) return;
    scrollRef.current.scrollTo({ left: Math.max(0, layout.px0 - JUMP_LEFT_MARGIN), behavior: "smooth" });
  }

  // Click-to-jump and drag-to-pan share one handler: seek on pointer down,
  // then keep seeking on every move until pointerup, wherever the pointer
  // ends up (not just while over the track).
  function handleMinimapPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const track = minimapTrackRef.current;
    const scroller = scrollRef.current;
    if (!track || !scroller) return;
    function seek(clientX: number) {
      const rect = track!.getBoundingClientRect();
      const frac = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      scroller!.scrollTo({ left: frac * TIMELINE_AXIS_WIDTH - scroller!.clientWidth / 2, behavior: "auto" });
    }
    seek(e.clientX);
    function onMove(ev: PointerEvent) {
      seek(ev.clientX);
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  const { totalDots, passingDots } = useMemo(() => {
    let total = 0;
    let passing = 0;
    for (const era of eras) {
      total += era.movies.length;
      passing += era.movies.filter((m) => minRating === 0 || (m.ratingAverage ?? 0) >= minRating).length;
    }
    return { totalDots: total, passingDots: passing };
  }, [eras, minRating]);

  return (
    <div className="mt-8">
      {/* ============ era quick-jump chips + jump-to-present ============ */}
      <div className="rail-scrollbar mb-2 flex items-center gap-2 overflow-x-auto pb-1 pl-4 sm:pl-6 lg:pl-10">
        {eras.map((era) => (
          <button
            key={era.key}
            type="button"
            onClick={() => jumpTo(era.key)}
            className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium whitespace-nowrap ${
              activeKey === era.key
                ? "border-red-600 bg-red-950/40 text-red-400"
                : "border-neutral-700 text-neutral-300 hover:border-neutral-500 hover:text-white"
            }`}
          >
            {era.name}
          </button>
        ))}
        <div className="mx-1 h-5 w-px shrink-0 bg-neutral-800" />
        <button
          type="button"
          onClick={() => jumpTo("CONTEMPORARY")}
          className="shrink-0 rounded-full bg-red-700 px-3 py-1 text-[11px] font-semibold whitespace-nowrap text-neutral-100 hover:bg-red-600"
        >
          Today →
        </button>
      </div>

      {/* ============ rating filter, dims non-matching dots in place ============ */}
      <div className="mb-1 flex flex-wrap items-center gap-2 pl-4 sm:pl-6 lg:pl-10">
        <span className="text-[11px] text-neutral-500">Min. rating:</span>
        {RATING_FILTER_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setMinRating(option)}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
              minRating === option
                ? "border-red-600 bg-red-950/40 text-red-400"
                : "border-neutral-700 text-neutral-300 hover:border-neutral-500 hover:text-white"
            }`}
          >
            {option === 0 ? "Any" : `★ ${option}+`}
          </button>
        ))}
        {minRating > 0 && (
          <span className="text-[11px] text-neutral-500">
            {passingDots} of {totalDots} shown
          </span>
        )}
      </div>

      <div ref={scrollRef} className="rail-scrollbar relative overflow-x-auto overflow-y-hidden pb-5 pl-4 sm:pl-6 lg:pl-10">
        <div className="relative" style={{ width: TIMELINE_AXIS_WIDTH, height: PLOT_HEIGHT_ABOVE_BASELINE + AXIS_BASELINE_PX }}>
          {/* axis-break: the scale changes here, marked rather than hidden.
              The hatch pattern alone (plus the tick ruler's own density
              change) discloses THAT something changes, but not WHY -- to
              anyone who hasn't read this feature's own history, it can read
              as a rendering glitch instead. This adds an explicit legend,
              opt-in via hover/focus rather than a permanent caption, so it
              doesn't reintroduce the "note" this feature deliberately moved
              away from (see DECISIONS.md). */}
          <div className="group absolute top-0" style={{ left: AXIS_BREAK_PX, bottom: AXIS_BASELINE_PX, width: 12 }}>
            <button
              type="button"
              aria-label="Scale change: the axis compresses less per year from the 1950s onward than it does before, shown by how much tighter the tick marks below are packed on either side"
              className="absolute inset-0 cursor-help border-0 p-0"
              style={{
                background: "repeating-linear-gradient(-55deg, var(--color-neutral-950) 0 3px, var(--color-neutral-900) 3px 6px)",
              }}
            />
            <div
              className="pointer-events-none absolute left-1/2 z-20 -translate-x-1/2 rounded-md border border-neutral-700 bg-neutral-900 p-2 text-center text-[11px] whitespace-nowrap text-neutral-300 opacity-0 shadow-lg transition group-hover:opacity-100 group-focus-within:opacity-100"
              style={{ bottom: 14 }}
            >
              Scale change — less axis per year from here on
            </div>
          </div>

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

                {/* A band with real movies always gets at least one dot, so
                    this only fires for eras with none at all -- otherwise
                    that band would be indistinguishable blank space between
                    its neighbors' dot clusters, reading as broken rather
                    than as "confirmed nothing here yet". */}
                {era.totalCount === 0 && (
                  <p
                    className="absolute -translate-x-1/2 text-[10px] whitespace-nowrap text-neutral-700 italic"
                    style={{ left: layout.px0 + width / 2, bottom: AXIS_BASELINE_PX + 8 }}
                  >
                    No movies yet
                  </p>
                )}

                {dots.map((dot) => {
                  const posterUrl = resolvePosterUrl(dot.movie);
                  const passesFilter = minRating === 0 || (dot.movie.ratingAverage ?? 0) >= minRating;
                  return (
                    <Link
                      key={dot.movie.id}
                      href={`/movies/${dot.movie.id}`}
                      className="group absolute flex h-6 w-6 items-center justify-center"
                      style={{ left: dot.left, bottom: dot.bottom }}
                    >
                      <span
                        className={`h-2 w-2 rounded-full bg-amber-500 shadow-[0_0_0_2px_var(--color-neutral-950)] transition group-hover:scale-150 group-hover:bg-amber-400 group-focus-visible:scale-150 group-focus-visible:bg-amber-400 ${
                          passesFilter ? "opacity-100" : "opacity-25"
                        }`}
                      />
                      {/* group-focus-visible mirrors group-hover so keyboard
                          (Tab) users see the same poster/rating tooltip --
                          previously hover-only, meaning keyboard and most
                          touch interaction had no way to see it without
                          following the link away from the page. */}
                      <div
                        className="pointer-events-none absolute bottom-full left-1/2 z-10 -translate-x-1/2 -translate-y-2 rounded-md border border-neutral-700 bg-neutral-900 p-2 opacity-0 shadow-lg transition group-hover:opacity-100 group-focus-visible:opacity-100"
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

      {/* ============ minimap / scrub bar ============ */}
      <div className="mx-4 mt-2 rounded-md border border-neutral-800 bg-neutral-900 px-3.5 py-2.5 sm:mx-6 lg:mx-10">
        <div
          ref={minimapTrackRef}
          onPointerDown={handleMinimapPointerDown}
          className="relative h-7 cursor-pointer touch-none select-none"
        >
          <div className="absolute right-0 bottom-0 left-0 h-px bg-neutral-700" />

          {TIMELINE_ERA_LAYOUT.map((layout) => {
            const era = eras.find((e) => e.key === layout.key);
            const count = era?.totalCount ?? 0;
            // Square-root scale, not linear -- one 80-movie era (Contemporary,
            // say) would otherwise dwarf every sparse dynasty band into
            // invisible slivers instead of a readable density read.
            const height = count === 0 ? 2 : Math.min(24, 4 + Math.sqrt(count) * 4);
            return (
              <div
                key={layout.key}
                className="absolute bottom-0 rounded-[1px] bg-amber-800"
                style={{
                  left: `${(layout.px0 / TIMELINE_AXIS_WIDTH) * 100}%`,
                  width: `${Math.max(0.3, ((layout.px1 - layout.px0) / TIMELINE_AXIS_WIDTH) * 100)}%`,
                  height,
                }}
              />
            );
          })}

          {/* the same scale-change break, shrunk down */}
          <div
            className="absolute top-0.5 bottom-0"
            style={{
              left: `calc(${(AXIS_BREAK_PX / TIMELINE_AXIS_WIDTH) * 100}% - 1px)`,
              width: 2,
              background: "repeating-linear-gradient(-55deg, var(--color-neutral-900) 0 2px, var(--color-neutral-700) 2px 4px)",
            }}
          />

          {/* current viewport indicator -- drag anywhere on the track (or
              this box) to pan the axis above */}
          <div
            className="pointer-events-none absolute top-[-4px] bottom-[-4px] rounded-[3px] border-[1.5px] border-red-600 bg-red-950/20"
            style={{
              left: `${(viewport.left / TIMELINE_AXIS_WIDTH) * 100}%`,
              width: `${Math.max(1.5, (viewport.width / TIMELINE_AXIS_WIDTH) * 100)}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
