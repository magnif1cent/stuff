import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";
import { isRatingCategoryKey } from "@/lib/rating-categories";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: movieId } = await params;
  const { category, score } = await request.json();

  if (!isRatingCategoryKey(category)) {
    return NextResponse.json({ error: "category is not a recognized rating category." }, { status: 400 });
  }
  if (typeof score !== "number" || !Number.isInteger(score) || score < 1 || score > 10) {
    return NextResponse.json({ error: "score must be an integer between 1 and 10." }, { status: 400 });
  }

  const rating = await prisma.subcategoryAdminRating.upsert({
    where: { adminId_movieId_category: { adminId: session.user.id, movieId, category } },
    update: { score },
    create: { adminId: session.user.id, movieId, category, score },
  });

  return NextResponse.json({ rating });
}
