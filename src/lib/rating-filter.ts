// Shared by /search and /search/fight-scenes: parses a "minimum rating"
// query param into a validated number, or undefined if absent/invalid.
// Ratings are on a 1-10 scale (see the rating API's score validation),
// but averages can be fractional, so any number in that range is valid,
// not just a fixed set of presets.
export function parseRatingFilter(value?: string): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1 || n > 10) return undefined;
  return n;
}
