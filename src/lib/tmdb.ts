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
  release_date: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  runtime: number | null;
  vote_average: number;
  popularity: number;
  production_countries: { iso_3166_1: string; name: string }[];
  genres: { id: number; name: string }[];
  credits: {
    cast: { id: number; name: string; character: string; order: number; profile_path: string | null }[];
    crew: { id: number; name: string; job: string }[];
  };
}

export async function getTmdbMovieDetails(tmdbId: number) {
  return tmdbFetch<TmdbMovieDetails>(`/movie/${tmdbId}`, {
    append_to_response: "credits",
  });
}
