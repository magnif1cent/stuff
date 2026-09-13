import { prisma } from "@/lib/prisma";
import { ERA_SETTINGS, type EraSettingKey } from "@/lib/era-settings";
import { getRatingSummaries } from "@/lib/ratings";
import {
  CHRONOLOGICAL_KEYS,
  compareByRatingDesc,
  desktopCapForKey,
  type TimelineEraData,
  type TimelineMovie,
  type TimelineOverview,
} from "@/lib/timeline-layout";

// Server-only data fetching for the Historical Timeline (needs prisma) --
// split out from timeline-layout.ts, which holds the pure axis/layout math
// so a client component can import that module without pulling prisma (and
// everything it drags in) into the browser bundle.
export * from "@/lib/timeline-layout";

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

// Shared fetch for both the desktop axis and the mobile overview -- one
// pass over every chronological era (skips "Other", which isn't plotted),
// each capped per desktopCapForKey so the mobile view (which only ever
// slices the first MOBILE_PREVIEW_CAP of these) doesn't need a second query.
export async function getTimelineOverview(): Promise<TimelineOverview> {
  const [counts, unsetCount, ...movieLists] = await Promise.all([
    getEraCounts(),
    prisma.movie.count({ where: { status: "APPROVED", eraSetting: null } }),
    ...CHRONOLOGICAL_KEYS.map((key) => moviesForEra(key, desktopCapForKey(key as EraSettingKey))),
  ]);

  const eras: TimelineEraData[] = CHRONOLOGICAL_KEYS.map((key, i) => {
    const meta = ERA_SETTINGS.find((e) => e.key === key)!;
    return {
      key: key as EraSettingKey,
      name: meta.name,
      years: meta.years,
      totalCount: counts.get(key) ?? 0,
      movies: movieLists[i],
    };
  });

  return { eras, otherCount: counts.get("OTHER") ?? 0, unsetCount };
}
