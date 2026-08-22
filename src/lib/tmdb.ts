const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p";

function getApiKey(): string {
  const key = process.env.TMDB_API_KEY;
  if (!key) {
    throw new Error(
      "TMDB_API_KEY is not set. Get a free API key at https://www.themoviedb.org/settings/api and add it to your .env file.",
    );
  }
  return key;
}

async function tmdbFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${TMDB_BASE_URL}${path}`);
  url.searchParams.set("api_key", getApiKey());
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`TMDB request failed (${res.status}): ${body}`);
  }
  return res.json() as Promise<T>;
}

export function tmdbImageUrl(path: string | null | undefined, size: "w200" | "w342" | "w500" | "w780" | "original" = "w500") {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE_URL}/${size}${path}`;
}

// An admin-uploaded poster always wins over whatever TMDB happens to have.
export function resolvePosterUrl(
  movie: { posterPath: string | null; posterOverrideUrl: string | null },
  size: "w200" | "w342" | "w500" | "w780" | "original" = "w500",
) {
  return movie.posterOverrideUrl || tmdbImageUrl(movie.posterPath, size);
}

export interface TmdbMovieSearchResult {
  id: number;
  title: string;
  original_title: string;
  release_date: string | null;
  overview: string;
  poster_path: string | null;
}

export async function searchTmdbMovies(query: string) {
  const data = await tmdbFetch<{ results: TmdbMovieSearchResult[] }>("/search/movie", {
    query,
    include_adult: "false",
  });
  return data.results;
}

export interface TmdbMovieDetails {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  tagline: string;
  release_date: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  runtime: number | null;
  vote_average: number;
  popularity: number;
  revenue: number;
  production_countries: { iso_3166_1: string; name: string }[];
  production_companies: { id: number; name: string }[];
  belongs_to_collection: { id: number; name: string } | null;
  genres: { id: number; name: string }[];
  credits: {
    cast: { id: number; name: string; character: string; order: number; profile_path: string | null }[];
    crew: { id: number; name: string; job: string }[];
  };
  release_dates: {
    results: { iso_3166_1: string; release_dates: { certification: string }[] }[];
  };
}

export async function getTmdbMovieDetails(tmdbId: number) {
  return tmdbFetch<TmdbMovieDetails>(`/movie/${tmdbId}`, {
    append_to_response: "credits,release_dates",
  });
}

// Only US certifications are surfaced -- this site's audience and existing
// conventions (English titles, US-style genre/rating expectations) are
// US-centric, and TMDB's release_dates data is inconsistent enough across
// other regions that picking one authoritative source beats trying to merge
// them.
export function extractUsCertification(details: TmdbMovieDetails): string | null {
  const us = details.release_dates.results.find((r) => r.iso_3166_1 === "US");
  const certification = us?.release_dates.find((rd) => rd.certification)?.certification;
  return certification || null;
}

export interface TmdbKeyword {
  id: number;
  name: string;
}

export async function searchTmdbKeywords(query: string) {
  const data = await tmdbFetch<{ results: TmdbKeyword[] }>("/search/keyword", { query });
  return data.results;
}

export interface TmdbDiscoverMovieResult {
  id: number;
  title: string;
  original_title: string;
  release_date: string | null;
  poster_path: string | null;
  overview: string;
  vote_average: number;
}

// TMDB's with_keywords param: comma = AND, pipe = OR (can't mix both in one
// call). We only need OR here — a film tagged "kung fu" OR "martial arts" is
// still a match, it doesn't need both tags. with_origin_country (undocumented
// in TMDB's official reference, but confirmed working) ANDs against that —
// combined with a keyword OR, it narrows to e.g. (kung fu OR martial arts)
// AND Hong Kong in a single call instead of filtering client-side.
export async function discoverMoviesByKeywords(keywordIds: number[], page: number, originCountry?: string) {
  return tmdbFetch<{
    results: TmdbDiscoverMovieResult[];
    page: number;
    total_pages: number;
    total_results: number;
  }>("/discover/movie", {
    with_keywords: keywordIds.join("|"),
    page: String(page),
    include_adult: "false",
    ...(originCountry ? { with_origin_country: originCountry } : {}),
  });
}

export interface TmdbPersonDetails {
  id: number;
  name: string;
  biography: string;
  birthday: string | null;
  deathday: string | null;
  place_of_birth: string | null;
  profile_path: string | null;
}

export async function getTmdbPersonDetails(tmdbId: number) {
  return tmdbFetch<TmdbPersonDetails>(`/person/${tmdbId}`);
}
