import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MAX_PERSON_TRIBUTE_LENGTH } from "@/lib/person-tributes";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ personId: string; tributeId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { personId, tributeId } = await params;
  const existing = await prisma.personTribute.findUnique({ where: { id: tributeId } });
  if (!existing || existing.personId !== personId) {
    return NextResponse.json({ error: "Tribute not found." }, { status: 404 });
  }
  if (existing.authorId !== session.user.id) {
    return NextResponse.json({ error: "You can only edit your own tribute." }, { status: 403 });
  }

  const { content } = await request.json();
  if (typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json({ error: "content is required." }, { status: 400 });
  }
  const trimmedContent = content.trim();
  if (trimmedContent.length > MAX_PERSON_TRIBUTE_LENGTH) {
    return NextResponse.json(
      { error: `content must be ${MAX_PERSON_TRIBUTE_LENGTH} characters or fewer.` },
      { status: 400 },
    );
  }

  const tribute = await prisma.personTribute.update({
    where: { id: tributeId },
    data: { content: trimmedContent },
    include: { author: { select: { username: true } } },
  });

  return NextResponse.json({ tribute });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ personId: string; tributeId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { personId, tributeId } = await params;
  const existing = await prisma.personTribute.findUnique({ where: { id: tributeId } });
  if (!existing || existing.personId !== personId) {
    return NextResponse.json({ error: "Tribute not found." }, { status: 404 });
  }

  const isOwner = existing.authorId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Hard delete -- same as MemberReview, nothing else needs the row to
  // stick around; its votes cascade away with it.
  await prisma.personTribute.delete({ where: { id: tributeId } });

  return NextResponse.json({ ok: true });
}
