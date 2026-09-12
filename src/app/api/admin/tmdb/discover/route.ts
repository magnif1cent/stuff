import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/require-admin";
import {
  discoverMoviesByCast,
  discoverMoviesByCompany,
  discoverMoviesByKeywords,
  extractTopBilledCast,
  getTmdbMovieDetails,
} from "@/lib/tmdb";
import { prisma } from "@/lib/prisma";
import { tmdbErrorResponse } from "@/lib/api-error";

// TMDB refuses to serve page 501+ even when total_pages reports higher.
const MAX_DISCOVER_PAGE = 500;
const DISPLAY_CAST_COUNT = 3;
const MIN_YEAR = 1870;

type ParsedYear = { ok: true; year: number | undefined } | { ok: false; error: string };

function parseYearParam(value: string | null, paramName: string): ParsedYear {
  if (!value) return { ok: true, year: undefined };
  const year = Number(value);
  const maxYear = new Date().getFullYear() + 5;
  if (!Number.isInteger(year) || year < MIN_YEAR || year > maxYear) {
    return { ok: false, error: `${paramName} must be a year between ${MIN_YEAR} and ${maxYear}` };
  }
  return { ok: true, year };
}

export async function GET(request: Request) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const keywordsParam = url.searchParams.get("keywords");
  const personIdParam = url.searchParams.get("personId");
  const companyIdParam = url.searchParams.get("companyId");
  const providedFilterCount = [keywordsParam, personIdParam, companyIdParam].filter((v) => v !== null).length;
  if (providedFilterCount === 0) {
    return NextResponse.json(
      { error: "Missing query parameter keywords, personId, or companyId" },
      { status: 400 },
    );
  }
  if (providedFilterCount > 1) {
    return NextResponse.json(
      { error: "Provide only one of keywords, personId, or companyId" },
      { status: 400 },
    );
  }

  let keywordIds: number[] = [];
  let personId: number | null = null;
  let companyId: number | null = null;
  if (keywordsParam) {
    keywordIds = keywordsParam
      .split(",")
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id));
    if (keywordIds.length === 0) {
      return NextResponse.json({ error: "keywords must be a comma-separated list of keyword ids" }, { status: 400 });
    }
  } else if (personIdParam) {
    personId = Number(personIdParam);
    if (!Number.isInteger(personId)) {
      return NextResponse.json({ error: "personId must be an integer" }, { status: 400 });
    }
  } else {
    companyId = Number(companyIdParam);
    if (!Number.isInteger(companyId)) {
      return NextResponse.json({ error: "companyId must be an integer" }, { status: 400 });
    }
  }

  const page = Number(url.searchParams.get("page") ?? "1");
  if (!Number.isInteger(page) || page < 1 || page > MAX_DISCOVER_PAGE) {
    return NextResponse.json({ error: `page must be between 1 and ${MAX_DISCOVER_PAGE}` }, { status: 400 });
  }

  const countryParam = url.searchParams.get("country");
  if (countryParam && !/^[A-Z]{2}$/.test(countryParam)) {
    return NextResponse.json({ error: "country must be a 2-letter ISO 3166-1 code (e.g. HK)" }, { status: 400 });
  }

  const parsedYearFrom = parseYearParam(url.searchParams.get("yearFrom"), "yearFrom");
  if (!parsedYearFrom.ok) {
    return NextResponse.json({ error: parsedYearFrom.error }, { status: 400 });
  }
  const parsedYearTo = parseYearParam(url.searchParams.get("yearTo"), "yearTo");
  if (!parsedYearTo.ok) {
    return NextResponse.json({ error: parsedYearTo.error }, { status: 400 });
  }
  if (parsedYearFrom.year && parsedYearTo.year && parsedYearFrom.year > parsedYearTo.year) {
    return NextResponse.json({ error: "yearFrom must be less than or equal to yearTo" }, { status: 400 });
  }

  const discoverOptions = {
    originCountry: countryParam ?? undefined,
    yearFrom: parsedYearFrom.year,
    yearTo: parsedYearTo.year,
  };

  try {
    const discovered = personId
      ? await discoverMoviesByCast(personId, page, discoverOptions)
      : companyId
        ? await discoverMoviesByCompany(companyId, page, discoverOptions)
        : await discoverMoviesByKeywords(keywordIds, page, discoverOptions);

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
        const topCast = details ? extractTopBilledCast(details, DISPLAY_CAST_COUNT) : [];

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
    const subject = personId
      ? `person ${personId}`
      : companyId
        ? `company ${companyId}`
        : `keywords ${keywordsParam}`;
    return tmdbErrorResponse(`Failed to discover TMDB movies for ${subject}:`, error);
  }
}
