import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/require-admin";
import { searchTmdbMovies } from "@/lib/tmdb";
import { tmdbErrorResponse } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const query = new URL(request.url).searchParams.get("q");
  if (!query) {
    return NextResponse.json({ error: "Missing query parameter q" }, { status: 400 });
  }

  try {
    const tmdbResults = await searchTmdbMovies(query);

    // Flag results that are already in the catalog (with the catalog id, so
    // the UI can link straight to the movie page instead of offering Import).
    const existing = await prisma.movie.findMany({
      where: { tmdbId: { in: tmdbResults.map((r) => r.id) } },
      select: { id: true, tmdbId: true },
    });
    const catalogIdByTmdbId = new Map(existing.map((m) => [m.tmdbId, m.id]));
    const results = tmdbResults.map((movie) => ({
      ...movie,
      catalogMovieId: catalogIdByTmdbId.get(movie.id) ?? null,
    }));

    return NextResponse.json({ results });
  } catch (error) {
    return tmdbErrorResponse(`Failed to search TMDB for "${query}":`, error);
  }
}
