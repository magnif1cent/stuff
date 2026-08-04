import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";

const MAX_EDITORIAL_REVIEW_LENGTH = 10000;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: movieId } = await params;
  const { content } = await request.json();

  if (typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json({ error: "content is required." }, { status: 400 });
  }
  const trimmedContent = content.trim();
  if (trimmedContent.length > MAX_EDITORIAL_REVIEW_LENGTH) {
    return NextResponse.json(
      { error: `content must be ${MAX_EDITORIAL_REVIEW_LENGTH} characters or fewer.` },
      { status: 400 },
    );
  }

  // One review per movie (not per-admin, unlike AdminRating) — any admin can
  // write or update it; authorId just tracks who last touched it.
  const review = await prisma.editorialReview.upsert({
    where: { movieId },
    update: { content: trimmedContent, authorId: session.user.id },
    create: { movieId, authorId: session.user.id, content: trimmedContent },
    include: { author: { select: { name: true } } },
  });

  return NextResponse.json({ review });
}
