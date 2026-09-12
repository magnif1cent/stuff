import Link from "next/link";
import {
  computeDotLayout,
  overflowBadgeBottom,
  TIMELINE_AXIS_WIDTH,
  TIMELINE_ERA_LAYOUT,
  AXIS_BREAK_PX,
  type TimelineEraData,
} from "@/lib/timeline";

// Pure CSS hover (Tailwind's group/group-hover) — no client JS needed for
// the tooltip. Each dot's hit area is 24px even though the painted dot is
// 8px, per the usual "hit target bigger than the mark" rule for dense
// scatter marks.
export function TimelineDesktop({ eras }: { eras: TimelineEraData[] }) {
  const layoutByKey = new Map(TIMELINE_ERA_LAYOUT.map((e) => [e.key, e]));

  return (
    <div className="rail-scrollbar relative mt-8 overflow-x-auto overflow-y-hidden pb-5">
      <div className="relative" style={{ width: TIMELINE_AXIS_WIDTH, height: 300 }}>
        {/* axis-break: the scale changes here, marked rather than hidden */}
        <div
          className="absolute top-0"
          style={{
            left: AXIS_BREAK_PX,
            bottom: 26,
            width: 12,
            background: "repeating-linear-gradient(-55deg, var(--color-neutral-950) 0 3px, var(--color-neutral-900) 3px 6px)",
          }}
        />
        <p
          className="absolute text-center text-[10px] leading-tight text-neutral-600"
          style={{ left: AXIS_BREAK_PX - 115, bottom: 260, width: 240 }}
        >
          ⌇ scale expands here — recent eras get more room per year than earlier ones ⌇
        </p>

        {/* one continuous axis line under every band */}
        <div className="absolute right-0 bottom-[26px] left-0 h-0.5 bg-neutral-700" />

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
                style={{ left: layout.px0 + width / 2, bottom: 0, width: 150, transform: "translateX(-50%)" }}
              >
                <p className="truncate text-xs font-semibold text-neutral-300">{era.name}</p>
                <p className="mt-0.5 text-[10px] text-neutral-600">{era.years}</p>
              </div>

              {dots.map((dot) => (
                <Link
                  key={dot.movie.id}
                  href={`/movies/${dot.movie.id}`}
                  className="group absolute flex h-6 w-6 items-center justify-center"
                  style={{ left: dot.left, bottom: dot.bottom }}
                >
                  <span className="h-2 w-2 rounded-full bg-amber-500 shadow-[0_0_0_2px_var(--color-neutral-950)] transition group-hover:scale-150 group-hover:bg-amber-400" />
                  <span
                    className="pointer-events-none absolute bottom-full left-1/2 z-10 -translate-x-1/2 -translate-y-2 rounded-md border border-neutral-700 bg-neutral-900 px-2.5 py-2 opacity-0 shadow-lg transition group-hover:opacity-100"
                    style={{ width: 152 }}
                  >
                    <span className="block font-display text-xs tracking-wide text-neutral-100">{dot.movie.title}</span>
                    <span className="mt-1 block text-[11px] text-neutral-500">
                      {era.name}
                      {dot.movie.releaseDate ? ` · ${dot.movie.releaseDate.getFullYear()}` : ""}
                    </span>
                    {dot.movie.ratingAverage != null && (
                      <span className="mt-0.5 block text-[11px] font-semibold text-yellow-500">
                        ★ {dot.movie.ratingAverage.toFixed(1)}
                      </span>
                    )}
                  </span>
                </Link>
              ))}

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
