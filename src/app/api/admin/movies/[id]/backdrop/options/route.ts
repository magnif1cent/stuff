import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";
import { getTmdbMovieImages } from "@/lib/tmdb";
import { selectTopImages } from "@/lib/tmdb-image-options";
import { tmdbErrorResponse } from "@/lib/api-error";

// How many alternates to offer -- same cap as the poster picker, for the
// same reason (TMDB can return dozens of near-duplicate backdrops).
const MAX_OPTIONS = 24;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: movieId } = await params;
  const movie = await prisma.movie.findUnique({ where: { id: movieId }, select: { tmdbId: true } });
  if (!movie) {
    return NextResponse.json({ error: "Movie not found." }, { status: 404 });
  }

  try {
    const { backdrops } = await getTmdbMovieImages(movie.tmdbId);
    return NextResponse.json({ options: selectTopImages(backdrops, MAX_OPTIONS) });
  } catch (error) {
    return tmdbErrorResponse(`Failed to fetch TMDB backdrop options for movie ${movieId}:`, error);
  }
}
