// A curated subset rather than all ~250 ISO countries — these cover where
// most martial arts films actually come from. TMDB's with_origin_country
// takes any valid ISO 3166-1 code, so this list is just for a friendlier
// picker, not a hard restriction.
export const TMDB_COUNTRY_OPTIONS = [
  { code: "", name: "Any country" },
  { code: "HK", name: "Hong Kong" },
  { code: "CN", name: "China" },
  { code: "TW", name: "Taiwan" },
  { code: "JP", name: "Japan" },
  { code: "KR", name: "South Korea" },
  { code: "TH", name: "Thailand" },
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
] as const;
