import { prisma } from "@/lib/prisma";
import { ERA_SETTINGS, type EraSettingKey } from "@/lib/era-settings";
import { getRatingSummaries } from "@/lib/ratings";

// Desktop axis layout: hand-placed px0/px1 per era, NOT auto-derived from
// eraSettingYears() at runtime. Two reasons this stays a separate, static
// table instead of computing positions from real year spans:
//  1. Several eras' real ranges overlap by design in the vocabulary (e.g.
//     Jin 266-420 vs Three Kingdoms 220-280) -- fine as display text, not
//     fine as adjacent axis bands, which need non-overlapping boundaries.
//  2. The five most recent eras are deliberately NOT drawn at the same
//     px/year scale as everything before them (see AXIS_BREAK_PX below) --
//     a purely date-driven formula would undo that on its own.
// eraSettingYears(key) from era-settings.ts remains the source of truth for
// any DISPLAYED year text; these numbers are rendering-only.
export const TIMELINE_ERA_LAYOUT: { key: EraSettingKey; px0: number; px1: number }[] = [
  { key: "LEGENDARY", px0: 0, px1: 130 },
  { key: "WARRING_STATES", px0: 130, px1: 353 },
  { key: "QIN", px0: 353, px1: 366 },
  { key: "HAN", px0: 366, px1: 741 },
  { key: "THREE_KINGDOMS", px0: 741, px1: 794 },
  { key: "JIN", px0: 794, px1: 917 },
  { key: "TANG", px0: 1092, px1: 1346 },
  { key: "SONG", px0: 1393, px1: 1673 },
  { key: "YUAN", px0: 1673, px1: 1751 },
  { key: "MING", px0: 1751, px1: 1994 },
  { key: "QING", px0: 1994, px1: 2229 },
  { key: "REPUBLIC_ERA", px0: 2229, px1: 2262 },
  { key: "POSTWAR_ERA", px0: 2286, px1: 2532 },
  { key: "SEVENTIES", px0: 2532, px1: 2643 },
  { key: "EIGHTIES", px0: 2643, px1: 2754 },
  { key: "NINETIES", px0: 2754, px1: 2865 },
  { key: "CONTEMPORARY", px0: 2865, px1: 3185 },
];

// The gap between Republic of China's band and Postwar's is where the
// scale changes -- drawn as a visible break, never hidden.
export const AXIS_BREAK_PX = 2270;
export const TIMELINE_AXIS_WIDTH = 3245;

// Real calendar year range for each band a scale-disclosure tick ruler
// covers -- deliberately scoped to Qing onward, not the whole axis. Every
// dynasty before Qing already sits at one roughly-consistent px/year rate
// (see the comment atop this file), so there's no scale change to disclose
// there; Qing through Contemporary is exactly the stretch where the rate
// changes at AXIS_BREAK_PX, which is the one thing this ruler exists to
// make visible. Kept separate from TIMELINE_ERA_LAYOUT (not merged into
// it) since most eras have no meaningful single "year" to tick against --
// Warring States/Han/etc. span centuries at a scale where a 10-year tick
// is meaningless, and Legendary has no start date at all.
const TICK_YEAR_RANGE: Partial<Record<EraSettingKey, { startYear: number; endYear: number }>> = {
  QING: { startYear: 1644, endYear: 1912 },
  REPUBLIC_ERA: { startYear: 1912, endYear: 1949 },
  POSTWAR_ERA: { startYear: 1949, endYear: 1969 },
  SEVENTIES: { startYear: 1970, endYear: 1980 },
  EIGHTIES: { startYear: 1980, endYear: 1990 },
  NINETIES: { startYear: 1990, endYear: 2000 },
  // Open-ended in the vocabulary ("2000-present"); ticks stop at
  // TICK_YEAR_CAP regardless, so this only needs to be large enough that
  // the cap -- not this endpoint -- is what bounds the loop.
  CONTEMPORARY: { startYear: 2000, endYear: 2030 },
};
const TICK_STEP_YEARS = 10;
const TICK_LABEL_STEP_YEARS = 50;
// Ticks stop here rather than at each band's real (or open-ended) end --
// a static, rendering-only ruler that kept ticking into "the future" every
// year would read as a bug, not a feature.
const TICK_YEAR_CAP = 2020;

export interface ScaleTick {
  left: number;
  year: number;
  labeled: boolean;
}

// Every tick is exactly TICK_STEP_YEARS apart, computed independently per
// band (never by searching "which band contains year Y" across the whole
// axis) -- several eras' real year ranges overlap by design (see the
// TIMELINE_ERA_LAYOUT comment), so a global year->pixel search would be
// ambiguous. Each band only ever ticks within its own already-disjoint
// pixel span, using its own start/end year, so that ambiguity never
// arises. Constant tick spacing is the whole point: since it never
// changes, tick DENSITY on screen is what shows the scale change, not a
// number anyone has to read.
export function computeScaleTicks(): ScaleTick[] {
  const ticks: ScaleTick[] = [];
  for (const [key, range] of Object.entries(TICK_YEAR_RANGE) as [EraSettingKey, { startYear: number; endYear: number }][]) {
    const layout = LAYOUT_BY_KEY.get(key);
    if (!layout) continue;
    const { startYear, endYear } = range;
    const width = layout.px1 - layout.px0;
    const firstTick = Math.ceil(startYear / TICK_STEP_YEARS) * TICK_STEP_YEARS;
    // Strictly less than endYear (not <=): several of these bands share a
    // boundary year with the next one (Eighties ends 1990, Nineties starts
    // 1990) -- each band owns its own start year and yields its end year to
    // whichever band starts there, so that shared point gets exactly one
    // tick instead of two stacked on top of each other.
    for (let year = firstTick; year < endYear && year <= TICK_YEAR_CAP; year += TICK_STEP_YEARS) {
      const frac = (year - startYear) / (endYear - startYear);
      ticks.push({
        left: layout.px0 + frac * width,
        year,
        labeled: year % TICK_LABEL_STEP_YEARS === 0,
      });
    }
  }
  return ticks;
}

// Chronological order for everything EXCEPT "Other / Unspecified", which
// isn't a point in time and is surfaced separately, off the axis.
const CHRONOLOGICAL_KEYS = TIMELINE_ERA_LAYOUT.map((e) => e.key);
const LAYOUT_BY_KEY = new Map(TIMELINE_ERA_LAYOUT.map((e) => [e.key, e]));

// Deterministic column/row packing, not a scatter layout -- same movie set
// always renders at the same positions (no client JS, no hydration
// mismatch risk). Columns fill left-to-right per row before wrapping, with
// a small index-based (not random) left offset so a full row doesn't look
// like a ruler.
const DOT_PITCH = 9;
const ROW_HEIGHT = 13;

// Where the visual axis line sits, in the same bottom-anchored px space as
// every other coordinate in this file. Exported (not left as a component-
// local magic number) specifically so the axis line, the era name/years
// label below it, and the scale-tick ruler further below that all derive
// from the one value instead of three independently hand-tuned numbers
// that happen to agree -- the kind of drift that already caused a real bug
// once in this feature (the tooltip-clipping fix).
export const AXIS_BASELINE_PX = 46;
const ROW_BASELINE = AXIS_BASELINE_PX + 4;

function columnsForWidth(width: number): number {
  return Math.max(1, Math.floor(width / DOT_PITCH));
}

// How many movies render as dots/cards in the overview before a "View all"
// takes over -- independent of how many actually exist per era, so a
// 2-movie era and a 200-movie era cost the same to render. Scaled by how
// many columns an era's band actually fits: a flat cap would let a narrow
// band like Republic of China (3 columns) try to stack the same 60 dots as
// a wide one into 20 rows, overflowing the fixed-height plot area.
// MAX_ROWS_PER_ERA is chosen to stay well under that height at ROW_HEIGHT
// px per row.
const MAX_ROWS_PER_ERA = 8;
const DESKTOP_DOT_CAP_CEILING = 80; // absolute cap regardless of column count
const MOBILE_PREVIEW_CAP = 5;

function desktopCapForKey(key: EraSettingKey): number {
  const layout = LAYOUT_BY_KEY.get(key);
  if (!layout) return DESKTOP_DOT_CAP_CEILING;
  const cols = columnsForWidth(layout.px1 - layout.px0);
  return Math.min(DESKTOP_DOT_CAP_CEILING, cols * MAX_ROWS_PER_ERA);
}

// Carries what both views need: the desktop tooltip only wants the year,
// the mobile view wants full MovieCard fields (poster, release date as a
// real Date) so it can reuse that component rather than re-deriving a
// fake one from a bare year.
export interface TimelineMovie {
  id: string;
  title: string;
  releaseDate: Date | null;
  posterPath: string | null;
  posterOverrideUrl: string | null;
  tmdbRating: number | null;
  ratingAverage: number | null;
  ratingCount: number;
}

// Highest-rated first, unrated always last (so an era with more high-rated
// movies than its cap allows never bumps a rated movie for an unrated one);
// ties broken by rating count (more community confidence ranks higher),
// then release date (older first) so the order is still fully deterministic.
export function compareByRatingDesc(a: TimelineMovie, b: TimelineMovie): number {
  const ar = a.ratingAverage ?? -1;
  const br = b.ratingAverage ?? -1;
  if (ar !== br) return br - ar;
  if (a.ratingCount !== b.ratingCount) return b.ratingCount - a.ratingCount;
  const ad = a.releaseDate?.getTime() ?? 0;
  const bd = b.releaseDate?.getTime() ?? 0;
  return ad - bd;
}

async function moviesForEra(eraKey: string, take: number): Promise<TimelineMovie[]> {
  // Fetches every movie in the era (not DB-level `take`) because the cap has
  // to apply AFTER sorting by rating, not before -- otherwise a dense era
  // would cap to its oldest movies rather than its best ones.
  const movies = await prisma.movie.findMany({
    where: { eraSetting: eraKey, status: "APPROVED" },
    select: { id: true, title: true, releaseDate: true, posterPath: true, posterOverrideUrl: true, tmdbRating: true },
  });
  if (movies.length === 0) return [];

  const summaries = await getRatingSummaries(movies.map((m) => m.id));
  const withRatings = movies.map((m) => ({
    ...m,
    ratingAverage: summaries.get(m.id)?.average ?? null,
    ratingCount: summaries.get(m.id)?.count ?? 0,
  }));

  return withRatings.sort(compareByRatingDesc).slice(0, take);
}

// One counts query for every era at once, keyed by the vocabulary's own
// key order (chronological keys first, "Other" last) so callers never have
// to re-derive that ordering themselves.
export async function getEraCounts(): Promise<Map<string, number>> {
  const rows = await prisma.movie.groupBy({
    by: ["eraSetting"],
    where: { status: "APPROVED", eraSetting: { not: null } },
    _count: { _all: true },
  });
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (row.eraSetting) counts.set(row.eraSetting, row._count._all);
  }
  return counts;
}

export interface TimelineEraData {
  key: EraSettingKey;
  name: string;
  years: string | null;
  totalCount: number;
  movies: TimelineMovie[]; // capped preview, largest cap the callers need
}

export interface TimelineOverview {
  eras: TimelineEraData[];
  otherCount: number; // "Other / Unspecified" -- not chronological, not plotted on the axis
  unsetCount: number; // APPROVED movies with no eraSetting at all yet (the field is opt-in)
}

// Shared fetch for both the desktop axis and the mobile overview -- one
// pass over every chronological era (skips "Other", which isn't plotted),
// each capped per desktopCapForKey so the mobile view (which only ever
// slices the first MOBILE_PREVIEW_CAP of these) doesn't need a second query.
export async function getTimelineOverview(): Promise<TimelineOverview> {
  const [counts, unsetCount, ...movieLists] = await Promise.all([
    getEraCounts(),
    prisma.movie.count({ where: { status: "APPROVED", eraSetting: null } }),
    ...CHRONOLOGICAL_KEYS.map((key) => moviesForEra(key, desktopCapForKey(key))),
  ]);

  const eras = CHRONOLOGICAL_KEYS.map((key, i) => {
    const meta = ERA_SETTINGS.find((e) => e.key === key)!;
    return {
      key,
      name: meta.name,
      years: meta.years,
      totalCount: counts.get(key) ?? 0,
      movies: movieLists[i],
    };
  });

  return { eras, otherCount: counts.get("OTHER") ?? 0, unsetCount };
}

export function mobilePreview(era: TimelineEraData): TimelineMovie[] {
  return era.movies.slice(0, MOBILE_PREVIEW_CAP);
}

export interface TimelineDot {
  movie: TimelineMovie;
  left: number;
  bottom: number;
}

export function computeDotLayout(era: { px0: number; px1: number }, movies: TimelineMovie[]): TimelineDot[] {
  const width = era.px1 - era.px0;
  const cols = columnsForWidth(width);
  const colWidth = width / cols;
  const n = movies.length;
  const last = n - 1;
  // Rows fill in fillIndex order (0, 1, 2, ...), so every row below the
  // highest occupied one is always completely full -- only the topmost row
  // can be partial. Left-packing that partial row (columns 0..k-1 out of
  // `cols`) reads as "off center" whenever an era has few movies relative to
  // its column count -- exactly the common case for a sparse era. Centering
  // just that one row fixes it without disturbing full rows, which already
  // span the band evenly.
  const topRow = n > 0 ? Math.floor(last / cols) : 0;
  const dotsInTopRow = n - topRow * cols;
  const topRowOffset = ((cols - dotsInTopRow) * colWidth) / 2;

  return movies.map((movie, i) => {
    // movies is sorted best-rated first (see compareByRatingDesc), but the
    // axis stacks best-rated highest -- so fill position walks the array
    // backwards: the lowest-rated/unrated movie (last in the array) takes
    // row 0 at the baseline, and the best-rated movie (first) ends up in
    // the tallest row.
    const fillIndex = last - i;
    const col = fillIndex % cols;
    const row = Math.floor(fillIndex / cols);
    const rowOffset = row === topRow ? topRowOffset : 0;
    const jitter = ((fillIndex % 5) - 2) * (Math.min(colWidth, 10) / 6);
    return {
      movie,
      left: era.px0 + rowOffset + col * colWidth + colWidth / 2 + jitter - 12,
      bottom: ROW_BASELINE + row * ROW_HEIGHT,
    };
  });
}

// Where an era's "+N more" badge sits -- just above its tallest row,
// centered on the band. Shared so the desktop component never has to
// re-derive the row-packing math itself.
export function overflowBadgeBottom(era: { px0: number; px1: number }, shownCount: number): number {
  const width = era.px1 - era.px0;
  const cols = columnsForWidth(width);
  const rows = Math.max(1, Math.ceil(shownCount / cols));
  return ROW_BASELINE + rows * ROW_HEIGHT + 6;
}
