import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MAX_PERSON_FUN_FACT_LENGTH } from "@/lib/person-fun-facts";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ personId: string; factId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { personId, factId } = await params;
  const existing = await prisma.personFunFact.findUnique({ where: { id: factId } });
  if (!existing || existing.personId !== personId) {
    return NextResponse.json({ error: "Fun fact not found." }, { status: 404 });
  }
  if (existing.submittedById !== session.user.id) {
    return NextResponse.json({ error: "You can only edit your own fun facts." }, { status: 403 });
  }
  if (existing.isDeleted) {
    return NextResponse.json({ error: "This fun fact has been deleted." }, { status: 400 });
  }

  const { content } = await request.json();
  if (typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json({ error: "content is required." }, { status: 400 });
  }
  const trimmedContent = content.trim();
  if (trimmedContent.length > MAX_PERSON_FUN_FACT_LENGTH) {
    return NextResponse.json(
      { error: `content must be ${MAX_PERSON_FUN_FACT_LENGTH} characters or fewer.` },
      { status: 400 },
    );
  }

  const fact = await prisma.personFunFact.update({
    where: { id: factId },
    data: { content: trimmedContent },
    include: { submittedBy: { select: { username: true } } },
  });

  return NextResponse.json({ fact });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ personId: string; factId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { personId, factId } = await params;
  const existing = await prisma.personFunFact.findUnique({ where: { id: factId } });
  if (!existing || existing.personId !== personId) {
    return NextResponse.json({ error: "Fun fact not found." }, { status: 404 });
  }

  const isOwner = existing.submittedById === session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Soft-delete, same as movie FunFact -- keeps the row (and its vote
  // history) intact rather than hard-deleting.
  await prisma.personFunFact.update({
    where: { id: factId },
    data: { isDeleted: true, content: "" },
  });

  return NextResponse.json({ ok: true });
}
