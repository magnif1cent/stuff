import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isEmailVerified } from "@/lib/verification";
import { MAX_FUN_FACT_LENGTH } from "@/lib/fun-facts";
import { checkRateLimit, funFactSubmitLimiter } from "@/lib/rate-limit";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in to add a fun fact." }, { status: 401 });
  }
  if (!(await isEmailVerified(session.user.id))) {
    return NextResponse.json({ error: "Verify your email before adding a fun fact." }, { status: 403 });
  }

  const rateLimit = await checkRateLimit(funFactSubmitLimiter, session.user.id);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "You're adding facts too quickly. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  const { id: movieId } = await params;
  const { content } = await request.json();

  if (typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json({ error: "content is required." }, { status: 400 });
  }
  const trimmedContent = content.trim();
  if (trimmedContent.length > MAX_FUN_FACT_LENGTH) {
    return NextResponse.json(
      { error: `content must be ${MAX_FUN_FACT_LENGTH} characters or fewer.` },
      { status: 400 },
    );
  }

  const movie = await prisma.movie.findUnique({ where: { id: movieId }, select: { id: true } });
  if (!movie) {
    return NextResponse.json({ error: "Movie not found." }, { status: 404 });
  }

  const fact = await prisma.funFact.create({
    data: { movieId, submittedById: session.user.id, content: trimmedContent },
    include: { submittedBy: { select: { username: true } } },
  });

  return NextResponse.json({ fact });
}
