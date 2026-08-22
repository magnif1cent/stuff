import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isEmailVerified } from "@/lib/verification";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ personId: string; tributeId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in to vote." }, { status: 401 });
  }
  if (!(await isEmailVerified(session.user.id))) {
    return NextResponse.json({ error: "Verify your email before voting." }, { status: 403 });
  }

  const { personId, tributeId } = await params;
  const { value } = await request.json();
  if (value !== 1 && value !== -1) {
    return NextResponse.json({ error: "value must be 1 or -1." }, { status: 400 });
  }

  const tribute = await prisma.personTribute.findUnique({ where: { id: tributeId } });
  if (!tribute || tribute.personId !== personId) {
    return NextResponse.json({ error: "Tribute not found." }, { status: 404 });
  }
  if (tribute.authorId === session.user.id) {
    return NextResponse.json({ error: "You can't vote on your own tribute." }, { status: 403 });
  }

  const existing = await prisma.personTributeVote.findUnique({
    where: { userId_tributeId: { userId: session.user.id, tributeId } },
  });

  let myVote: number | null;
  if (!existing) {
    await prisma.personTributeVote.create({ data: { userId: session.user.id, tributeId, value } });
    myVote = value;
  } else if (existing.value === value) {
    // Voting the same direction again retracts it, same toggle behavior as
    // Fun Fact / member review voting.
    await prisma.personTributeVote.delete({ where: { id: existing.id } });
    myVote = null;
  } else {
    await prisma.personTributeVote.update({ where: { id: existing.id }, data: { value } });
    myVote = value;
  }

  const [up, down] = await Promise.all([
    prisma.personTributeVote.count({ where: { tributeId, value: 1 } }),
    prisma.personTributeVote.count({ where: { tributeId, value: -1 } }),
  ]);

  // voteScore is denormalized onto the tribute row so pagination can sort by
  // it at the DB level -- keep it in sync every time a vote changes.
  await prisma.personTribute.update({ where: { id: tributeId }, data: { voteScore: up - down } });

  return NextResponse.json({ myVote, up, down });
}
