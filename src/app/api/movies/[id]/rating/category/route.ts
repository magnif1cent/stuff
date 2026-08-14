import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isEmailVerified } from "@/lib/verification";
import { isRatingCategoryKey } from "@/lib/rating-categories";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in to rate movies." }, { status: 401 });
  }
  if (!(await isEmailVerified(session.user.id))) {
    return NextResponse.json({ error: "Verify your email before rating movies." }, { status: 403 });
  }

  const { id: movieId } = await params;
  const { category, score } = await request.json();

  if (!isRatingCategoryKey(category)) {
    return NextResponse.json({ error: "category is not a recognized rating category." }, { status: 400 });
  }
  if (typeof score !== "number" || !Number.isInteger(score) || score < 1 || score > 10) {
    return NextResponse.json({ error: "score must be an integer between 1 and 10." }, { status: 400 });
  }

  const rating = await prisma.subcategoryRating.upsert({
    where: { userId_movieId_category: { userId: session.user.id, movieId, category } },
    update: { score },
    create: { userId: session.user.id, movieId, category, score },
  });

  return NextResponse.json({ rating });
}
