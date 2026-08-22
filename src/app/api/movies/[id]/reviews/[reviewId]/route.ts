import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MAX_MEMBER_REVIEW_LENGTH } from "@/lib/member-reviews";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; reviewId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { id: movieId, reviewId } = await params;
  const existing = await prisma.memberReview.findUnique({ where: { id: reviewId } });
  if (!existing || existing.movieId !== movieId) {
    return NextResponse.json({ error: "Review not found." }, { status: 404 });
  }
  if (existing.authorId !== session.user.id) {
    return NextResponse.json({ error: "You can only edit your own review." }, { status: 403 });
  }

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

  const review = await prisma.memberReview.update({
    where: { id: reviewId },
    data: { content: trimmedContent },
    include: { author: { select: { username: true } } },
  });

  return NextResponse.json({ review });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; reviewId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { id: movieId, reviewId } = await params;
  const existing = await prisma.memberReview.findUnique({ where: { id: reviewId } });
  if (!existing || existing.movieId !== movieId) {
    return NextResponse.json({ error: "Review not found." }, { status: 404 });
  }

  const isOwner = existing.authorId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Hard delete -- unlike FunFact, nothing else (no votes) depends on this
  // row surviving, so there's no reason to soft-delete it.
  await prisma.memberReview.delete({ where: { id: reviewId } });

  return NextResponse.json({ ok: true });
}
