import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isEmailVerified } from "@/lib/verification";
import { checkRateLimit, eraSettingEditLimiter } from "@/lib/rate-limit";
import { isEraSettingKey } from "@/lib/era-settings";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in to edit the era setting." }, { status: 401 });
  }

  // Admins/reviewers bypass the verified-email requirement, same as every
  // other admin-gated action in this app trusts the account itself rather
  // than re-checking verification.
  const isStaff = session.user.role === "ADMIN" || session.user.role === "REVIEWER";
  if (!isStaff && !(await isEmailVerified(session.user.id))) {
    return NextResponse.json({ error: "Verify your email before editing the era setting." }, { status: 403 });
  }

  const { id: movieId } = await params;
  const { era } = await request.json();

  if (!isEraSettingKey(era)) {
    return NextResponse.json({ error: "Pick a valid era from the list." }, { status: 400 });
  }

  const rateLimit = await checkRateLimit(eraSettingEditLimiter, session.user.id);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "You're editing too quickly. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  const movie = await prisma.movie.findUnique({ where: { id: movieId }, select: { eraSetting: true } });
  if (!movie) {
    return NextResponse.json({ error: "Movie not found." }, { status: 404 });
  }

  const [, updated] = await prisma.$transaction([
    prisma.eraSettingEdit.create({
      data: {
        movieId,
        editedById: session.user.id,
        previousValue: movie.eraSetting,
        newValue: era,
      },
    }),
    prisma.movie.update({ where: { id: movieId }, data: { eraSetting: era } }),
  ]);

  return NextResponse.json({ eraSetting: updated.eraSetting });
}
