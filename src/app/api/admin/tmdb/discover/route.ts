import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/require-admin";
import { discoverMoviesByKeywords, getTmdbMovieDetails } from "@/lib/tmdb";
import { prisma } from "@/lib/prisma";
import { tmdbErrorResponse } from "@/lib/api-error";

// TMDB refuses to serve page 501+ even when total_pages reports higher.
const MAX_DISCOVER_PAGE = 500;
const DISPLAY_CAST_COUNT = 3;

export async function GET(request: Request) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const keywordsParam = url.searchParams.get("keywords");
  if (!keywordsParam) {
    return NextResponse.json({ error: "Missing query parameter keywords" }, { status: 400 });
  }
  const keywordIds = keywordsParam
    .split(",")
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id));
  if (keywordIds.length === 0) {
    return NextResponse.json({ error: "keywords must be a comma-separated list of keyword ids" }, { status: 400 });
  }

  const page = Number(url.searchParams.get("page") ?? "1");
  if (!Number.isInteger(page) || page < 1 || page > MAX_DISCOVER_PAGE) {
    return NextResponse.json({ error: `page must be between 1 and ${MAX_DISCOVER_PAGE}` }, { status: 400 });
  }

  const countryParam = url.searchParams.get("country");
  if (countryParam && !/^[A-Z]{2}$/.test(countryParam)) {
    return NextResponse.json({ error: "country must be a 2-letter ISO 3166-1 code (e.g. HK)" }, { status: 400 });
  }

  try {
    const discovered = await discoverMoviesByKeywords(keywordIds, page, countryParam ?? undefined);

    const alreadyImported = await prisma.movie.findMany({
      where: { tmdbId: { in: discovered.results.map((r) => r.id) } },
      select: { tmdbId: true },
    });
    const importedIds = new Set(alreadyImported.map((m) => m.tmdbId));

    // /discover/movie doesn't include country or cast, so we fetch full
    // details per result (same call the single-title import path already
    // makes) to get those. A failed detail fetch for one movie shouldn't
    // sink the whole page — fall back to blank country/cast for that card.
    const results = await Promise.all(
      discovered.results.map(async (movie) => {
        const details = await getTmdbMovieDetails(movie.id).catch(() => null);
        const topCast = details
          ? [...details.credits.cast]
              .sort((a, b) => a.order - b.order)
              .slice(0, DISPLAY_CAST_COUNT)
              .map((c) => c.name)
          : [];

        return {
          tmdbId: movie.id,
          title: movie.title,
          originalTitle: movie.original_title,
          releaseDate: movie.release_date,
          posterPath: movie.poster_path,
          overview: movie.overview,
          voteAverage: movie.vote_average,
          country: details?.production_countries[0]?.name ?? null,
          topCast,
          alreadyImported: importedIds.has(movie.id),
        };
      }),
    );

    return NextResponse.json({
      results,
      page: discovered.page,
      totalPages: Math.min(discovered.total_pages, MAX_DISCOVER_PAGE),
      totalResults: discovered.total_results,
    });
  } catch (error) {
    return tmdbErrorResponse(`Failed to discover TMDB movies for keywords ${keywordsParam}:`, error);
  }
}
