import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isEmailVerified } from "@/lib/verification";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; reviewId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in to vote." }, { status: 401 });
  }
  if (!(await isEmailVerified(session.user.id))) {
    return NextResponse.json({ error: "Verify your email before voting." }, { status: 403 });
  }

  const { id: movieId, reviewId } = await params;
  const { value } = await request.json();
  if (value !== 1 && value !== -1) {
    return NextResponse.json({ error: "value must be 1 or -1." }, { status: 400 });
  }

  const review = await prisma.memberReview.findUnique({ where: { id: reviewId } });
  if (!review || review.movieId !== movieId) {
    return NextResponse.json({ error: "Review not found." }, { status: 404 });
  }
  if (review.authorId === session.user.id) {
    return NextResponse.json({ error: "You can't vote on your own review." }, { status: 403 });
  }

  const existing = await prisma.memberReviewVote.findUnique({
    where: { userId_reviewId: { userId: session.user.id, reviewId } },
  });

  let myVote: number | null;
  if (!existing) {
    await prisma.memberReviewVote.create({ data: { userId: session.user.id, reviewId, value } });
    myVote = value;
  } else if (existing.value === value) {
    // Voting the same direction again retracts it, same toggle behavior as
    // Fun Fact voting.
    await prisma.memberReviewVote.delete({ where: { id: existing.id } });
    myVote = null;
  } else {
    await prisma.memberReviewVote.update({ where: { id: existing.id }, data: { value } });
    myVote = value;
  }

  const [up, down] = await Promise.all([
    prisma.memberReviewVote.count({ where: { reviewId, value: 1 } }),
    prisma.memberReviewVote.count({ where: { reviewId, value: -1 } }),
  ]);

  // voteScore is denormalized onto the review row so pagination can sort by
  // it at the DB level -- keep it in sync every time a vote changes.
  await prisma.memberReview.update({ where: { id: reviewId }, data: { voteScore: up - down } });

  return NextResponse.json({ myVote, up, down });
}
