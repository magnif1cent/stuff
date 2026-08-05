import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isEmailVerified } from "@/lib/verification";
import { submitMovieForReview } from "@/lib/movie-submission";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in to add a movie." }, { status: 401 });
  }
  if (!(await isEmailVerified(session.user.id))) {
    return NextResponse.json({ error: "Verify your email before adding a movie." }, { status: 403 });
  }

  const { tmdbId } = await request.json();
  if (typeof tmdbId !== "number") {
    return NextResponse.json({ error: "tmdbId must be a number" }, { status: 400 });
  }

  try {
    const result = await submitMovieForReview(tmdbId, session.user.id);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }
    return NextResponse.json({ movie: result.movie });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
