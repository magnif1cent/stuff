import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isEmailVerified } from "@/lib/verification";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ personId: string; factId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in to vote." }, { status: 401 });
  }
  if (!(await isEmailVerified(session.user.id))) {
    return NextResponse.json({ error: "Verify your email before voting." }, { status: 403 });
  }

  const { personId, factId } = await params;
  const { value } = await request.json();
  if (value !== 1 && value !== -1) {
    return NextResponse.json({ error: "value must be 1 or -1." }, { status: 400 });
  }

  const fact = await prisma.personFunFact.findUnique({ where: { id: factId } });
  if (!fact || fact.personId !== personId || fact.isDeleted) {
    return NextResponse.json({ error: "Fun fact not found." }, { status: 404 });
  }
  if (fact.submittedById === session.user.id) {
    return NextResponse.json({ error: "You can't vote on your own fun fact." }, { status: 403 });
  }

  const existing = await prisma.personFunFactVote.findUnique({
    where: { userId_factId: { userId: session.user.id, factId } },
  });

  let myVote: number | null;
  if (!existing) {
    await prisma.personFunFactVote.create({ data: { userId: session.user.id, factId, value } });
    myVote = value;
  } else if (existing.value === value) {
    // Voting the same direction again retracts it, same toggle behavior as
    // movie FunFact voting.
    await prisma.personFunFactVote.delete({ where: { id: existing.id } });
    myVote = null;
  } else {
    await prisma.personFunFactVote.update({ where: { id: existing.id }, data: { value } });
    myVote = value;
  }

  const [up, down] = await Promise.all([
    prisma.personFunFactVote.count({ where: { factId, value: 1 } }),
    prisma.personFunFactVote.count({ where: { factId, value: -1 } }),
  ]);

  return NextResponse.json({ myVote, up, down });
}
