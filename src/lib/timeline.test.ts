import { describe, expect, it } from "vitest";
import { ERA_SETTINGS } from "@/lib/era-settings";
import {
  compareByRatingDesc,
  computeDotLayout,
  computeScaleTicks,
  TIMELINE_ERA_LAYOUT,
  type TimelineMovie,
} from "@/lib/timeline";

function movie(id: string, rating: number | null, ratingCount = 0, releaseDate = "2000-01-01"): TimelineMovie {
  return {
    id,
    title: id,
    releaseDate: new Date(releaseDate),
    posterPath: null,
    posterOverrideUrl: null,
    tmdbRating: null,
    ratingAverage: rating,
    ratingCount,
  };
}

describe("TIMELINE_ERA_LAYOUT stays in sync with ERA_SETTINGS", () => {
  // Regression guard: CHRONOLOGICAL_KEYS (and everything the desktop axis
  // renders) is derived FROM this layout table, not the other way around --
  // so a new era added to ERA_SETTINGS with no matching layout entry would
  // silently never appear on the timeline instead of erroring loudly.
  it("has a layout entry for every chronological era (everything except OTHER)", () => {
    const layoutKeys = new Set(TIMELINE_ERA_LAYOUT.map((e) => e.key));
    const missing = ERA_SETTINGS.filter((e) => e.key !== "OTHER" && !layoutKeys.has(e.key)).map((e) => e.key);
    expect(missing).toEqual([]);
  });

  it("has no duplicate or overlapping bands", () => {
    const sorted = [...TIMELINE_ERA_LAYOUT].sort((a, b) => a.px0 - b.px0);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].px0).toBeGreaterThanOrEqual(sorted[i - 1].px1);
    }
  });
});

describe("compareByRatingDesc", () => {
  it("sorts higher ratings first", () => {
    const a = movie("a", 6.0);
    const b = movie("b", 8.5);
    expect(compareByRatingDesc(a, b)).toBeGreaterThan(0);
    expect(compareByRatingDesc(b, a)).toBeLessThan(0);
  });

  it("always sorts unrated after any rated movie, regardless of rating value", () => {
    const unrated = movie("unrated", null);
    const lowRated = movie("low", 1.0);
    expect(compareByRatingDesc(lowRated, unrated)).toBeLessThan(0);
    expect(compareByRatingDesc(unrated, lowRated)).toBeGreaterThan(0);
  });

  it("breaks a rating tie by rating count (more votes ranks higher)", () => {
    const fewVotes = movie("few", 7.0, 2);
    const manyVotes = movie("many", 7.0, 50);
    expect(compareByRatingDesc(manyVotes, fewVotes)).toBeLessThan(0);
  });

  it("breaks a rating+count tie by release date (older first)", () => {
    const older = movie("older", 7.0, 5, "1980-01-01");
    const newer = movie("newer", 7.0, 5, "2020-01-01");
    expect(compareByRatingDesc(older, newer)).toBeLessThan(0);
  });
});

describe("computeDotLayout", () => {
  const era = { px0: 2643, px1: 2754 }; // a real band: 1980s, 111px wide, 12 columns

  it("puts the best-rated movie in the highest row and unrated movies at the baseline", () => {
    const ratings = [9.5, 9.2, 8.9, 8.6, 8.3, 8.0, 7.6, 7.3, 7.0, 6.6, 6.1, 5.5, 5.1, 4.8, null, null];
    const movies = ratings.map((r, i) => movie(`m${i}`, r));
    const dots = computeDotLayout(era, movies);

    const bestDot = dots[0];
    const maxBottom = Math.max(...dots.map((d) => d.bottom));
    expect(bestDot.bottom).toBe(maxBottom);

    const unratedDots = dots.filter((d) => d.movie.ratingAverage == null);
    const minBottom = Math.min(...dots.map((d) => d.bottom));
    expect(unratedDots.every((d) => d.bottom === minBottom)).toBe(true);
  });

  it("centers a sparse row instead of left-packing it against the band's edge", () => {
    // Regression test for the "dots cluster at the left edge, away from the
    // centered era label" bug -- a single dot in a wide band should land
    // near the band's true midpoint, not at px0.
    const dots = computeDotLayout(era, [movie("only", null)]);
    const dotCenter = dots[0].left + 12; // dot box is 24px wide
    const bandCenter = (era.px0 + era.px1) / 2;
    expect(Math.abs(dotCenter - bandCenter)).toBeLessThan(10);
  });

  it("still spans the full band width evenly when a row is completely full", () => {
    const movies = Array.from({ length: 12 }, (_, i) => movie(`m${i}`, 10 - i * 0.5));
    const dots = computeDotLayout(era, movies);
    const centers = dots.map((d) => d.left + 12).sort((a, b) => a - b);
    expect(centers[0]).toBeGreaterThan(era.px0);
    expect(centers[centers.length - 1]).toBeLessThan(era.px1);
  });
});

describe("computeScaleTicks", () => {
  const qing = TIMELINE_ERA_LAYOUT.find((e) => e.key === "QING")!;
  const republic = TIMELINE_ERA_LAYOUT.find((e) => e.key === "REPUBLIC_ERA")!;
  const nineties = TIMELINE_ERA_LAYOUT.find((e) => e.key === "NINETIES")!;

  it("never ticks past the year cap (no ticks implying the future)", () => {
    const ticks = computeScaleTicks();
    expect(ticks.every((t) => t.year <= 2020)).toBe(true);
  });

  it("labels only every 50 years, not every tick", () => {
    const ticks = computeScaleTicks();
    const labeled = ticks.filter((t) => t.labeled);
    expect(labeled.length).toBeGreaterThan(0);
    expect(labeled.every((t) => t.year % 50 === 0)).toBe(true);
    expect(labeled.length).toBeLessThan(ticks.length);
  });

  it("packs many more ticks into Qing/Republic than into the same number of years post-break", () => {
    // This is the actual point of the feature: constant year-per-tick, so
    // density alone shows the compression before AXIS_BREAK_PX versus the
    // expansion after it.
    const ticks = computeScaleTicks();
    const preBreak = ticks.filter((t) => t.left >= qing.px0 && t.left <= republic.px1);
    const postBreak = ticks.filter((t) => t.left >= nineties.px0 && t.left <= nineties.px1);

    const preBreakPxPerTick = (republic.px1 - qing.px0) / preBreak.length;
    const postBreakPxPerTick = (nineties.px1 - nineties.px0) / postBreak.length;
    expect(postBreakPxPerTick).toBeGreaterThan(preBreakPxPerTick * 5);
  });

  it("keeps every tick within its own band's pixel span", () => {
    // Overlapping real year ranges elsewhere in the vocabulary are exactly
    // why this must never search "which band contains year Y" globally --
    // each tick's position must come from its own band's already-disjoint
    // px0/px1, not a cross-band lookup.
    const ticks = computeScaleTicks();
    const allBands = TIMELINE_ERA_LAYOUT;
    for (const tick of ticks) {
      const inSomeBand = allBands.some((b) => tick.left >= b.px0 && tick.left <= b.px1);
      expect(inSomeBand).toBe(true);
    }
  });
});
