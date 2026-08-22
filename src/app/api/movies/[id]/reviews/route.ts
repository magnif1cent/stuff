import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isEmailVerified } from "@/lib/verification";
import { MAX_MEMBER_REVIEW_LENGTH } from "@/lib/member-reviews";
import { checkRateLimit, memberReviewSubmitLimiter } from "@/lib/rate-limit";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in to add a review." }, { status: 401 });
  }
  if (!(await isEmailVerified(session.user.id))) {
    return NextResponse.json({ error: "Verify your email before adding a review." }, { status: 403 });
  }

  const rateLimit = await checkRateLimit(memberReviewSubmitLimiter, session.user.id);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "You're adding reviews too quickly. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  const { id: movieId } = await params;
  const { content } = await request.json();

  if (typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json({ error: "content is required." }, { status: 400 });
  }
  const trimmedContent = content.trim();
  if (trimmedContent.length > MAX_MEMBER_REVIEW_LENGTH) {
    return NextResponse.json(
      { error: `content must be ${MAX_MEMBER_REVIEW_LENGTH} characters or fewer.` },
      { status: 400 },
    );
  }

  const movie = await prisma.movie.findUnique({ where: { id: movieId }, select: { id: true } });
  if (!movie) {
    return NextResponse.json({ error: "Movie not found." }, { status: 404 });
  }

  const existing = await prisma.memberReview.findUnique({
    where: { movieId_authorId: { movieId, authorId: session.user.id } },
  });
  if (existing) {
    return NextResponse.json(
      { error: "You've already reviewed this movie — edit your existing review instead." },
      { status: 409 },
    );
  }

  const review = await prisma.memberReview.create({
    data: { movieId, authorId: session.user.id, content: trimmedContent },
    include: { author: { select: { username: true } } },
  });

  return NextResponse.json({ review });
}
