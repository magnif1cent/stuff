import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";
import { getTmdbMoviePosters } from "@/lib/tmdb";
import { tmdbErrorResponse } from "@/lib/api-error";

// How many alternates to offer -- TMDB can return dozens of near-duplicate
// posters for a popular title, so this trims to the highest-voted ones
// rather than dumping everything into the picker.
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
    const posters = await getTmdbMoviePosters(movie.tmdbId);
    const options = [...posters]
      .sort((a, b) => b.vote_average - a.vote_average)
      .slice(0, MAX_OPTIONS)
      .map((p) => ({ filePath: p.file_path, width: p.width, height: p.height }));
    return NextResponse.json({ options });
  } catch (error) {
    return tmdbErrorResponse(`Failed to fetch TMDB poster options for movie ${movieId}:`, error);
  }
}
