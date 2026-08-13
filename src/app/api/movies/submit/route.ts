import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isEmailVerified } from "@/lib/verification";
import { submitMovieForReview } from "@/lib/movie-submission";
import { checkRateLimit, movieSubmitLimiter } from "@/lib/rate-limit";
import { tmdbErrorResponse } from "@/lib/api-error";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in to add a movie." }, { status: 401 });
  }
  if (!(await isEmailVerified(session.user.id))) {
    return NextResponse.json({ error: "Verify your email before adding a movie." }, { status: 403 });
  }

  const rateLimit = await checkRateLimit(movieSubmitLimiter, session.user.id);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "You're submitting too quickly. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
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
    return tmdbErrorResponse(`Failed to submit TMDB movie ${tmdbId}:`, error);
  }
}
