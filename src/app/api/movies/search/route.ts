import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isEmailVerified } from "@/lib/verification";
import { searchTmdbMoviesForSubmission } from "@/lib/movie-submission";
import { tmdbErrorResponse } from "@/lib/api-error";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in to add a movie." }, { status: 401 });
  }
  if (!(await isEmailVerified(session.user.id))) {
    return NextResponse.json({ error: "Verify your email before adding a movie." }, { status: 403 });
  }

  const query = new URL(request.url).searchParams.get("q");
  if (!query) {
    return NextResponse.json({ error: "Missing query parameter q" }, { status: 400 });
  }

  try {
    const results = await searchTmdbMoviesForSubmission(query);
    return NextResponse.json({ results });
  } catch (error) {
    return tmdbErrorResponse(`Failed to search TMDB for "${query}":`, error);
  }
}
