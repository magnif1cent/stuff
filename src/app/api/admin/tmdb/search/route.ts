import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/require-admin";
import { searchTmdbMovies } from "@/lib/tmdb";
import { tmdbErrorResponse } from "@/lib/api-error";

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
    const results = await searchTmdbMovies(query);
    return NextResponse.json({ results });
  } catch (error) {
    return tmdbErrorResponse(`Failed to search TMDB for "${query}":`, error);
  }
}
