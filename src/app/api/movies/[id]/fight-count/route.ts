import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isEmailVerified } from "@/lib/verification";
import { checkRateLimit, fightCountEditLimiter } from "@/lib/rate-limit";

const MAX_FIGHT_COUNT = 100;

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in to edit the fight count." }, { status: 401 });
  }

  // Admins/reviewers bypass the verified-email requirement, same as every
  // other admin-gated action in this app trusts the account itself rather
  // than re-checking verification.
  const isStaff = session.user.role === "ADMIN" || session.user.role === "REVIEWER";
  if (!isStaff && !(await isEmailVerified(session.user.id))) {
    return NextResponse.json({ error: "Verify your email before editing the fight count." }, { status: 403 });
  }

  const { id: movieId } = await params;
  const { count } = await request.json();

  if (typeof count !== "number" || !Number.isInteger(count) || count < 0 || count > MAX_FIGHT_COUNT) {
    return NextResponse.json(
      { error: `Fight count must be a whole number between 0 and ${MAX_FIGHT_COUNT}.` },
      { status: 400 },
    );
  }

  const rateLimit = await checkRateLimit(fightCountEditLimiter, session.user.id);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "You're editing too quickly. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  const movie = await prisma.movie.findUnique({ where: { id: movieId }, select: { trueFightCount: true } });
  if (!movie) {
    return NextResponse.json({ error: "Movie not found." }, { status: 404 });
  }

  const [, updated] = await prisma.$transaction([
    prisma.fightCountEdit.create({
      data: {
        movieId,
        editedById: session.user.id,
        previousValue: movie.trueFightCount,
        newValue: count,
      },
    }),
    prisma.movie.update({ where: { id: movieId }, data: { trueFightCount: count } }),
  ]);

  return NextResponse.json({ trueFightCount: updated.trueFightCount });
}
