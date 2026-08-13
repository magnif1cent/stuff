import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/require-admin";
import { importMovieFromTmdb } from "@/lib/tmdb-import";
import { tmdbErrorResponse } from "@/lib/api-error";

export async function POST(request: Request) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { tmdbId } = await request.json();
  if (typeof tmdbId !== "number") {
    return NextResponse.json({ error: "tmdbId must be a number" }, { status: 400 });
  }

  try {
    const movie = await importMovieFromTmdb(tmdbId);
    return NextResponse.json({ movie });
  } catch (error) {
    return tmdbErrorResponse(`Failed to import TMDB movie ${tmdbId}:`, error);
  }
}
