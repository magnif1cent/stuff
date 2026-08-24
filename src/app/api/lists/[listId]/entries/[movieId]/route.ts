import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MEMBER_LIST_ENTRY_NOTE_MAX_LENGTH } from "@/lib/member-lists";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ listId: string; movieId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { listId, movieId } = await params;
  const list = await prisma.memberList.findUnique({ where: { id: listId } });
  if (!list) {
    return NextResponse.json({ error: "List not found." }, { status: 404 });
  }
  if (list.userId !== session.user.id) {
    return NextResponse.json({ error: "You can only edit your own lists." }, { status: 403 });
  }

  const { note } = await request.json();
  if (note !== null && typeof note !== "string") {
    return NextResponse.json({ error: "note must be a string or null." }, { status: 400 });
  }
  const trimmedNote = typeof note === "string" ? note.trim() : null;
  if (trimmedNote && trimmedNote.length > MEMBER_LIST_ENTRY_NOTE_MAX_LENGTH) {
    return NextResponse.json(
      { error: `Notes must be ${MEMBER_LIST_ENTRY_NOTE_MAX_LENGTH} characters or fewer.` },
      { status: 400 },
    );
  }

  const entry = await prisma.memberListEntry.update({
    where: { listId_movieId: { listId, movieId } },
    data: { note: trimmedNote || null },
  });
  return NextResponse.json({ entry });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ listId: string; movieId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { listId, movieId } = await params;
  const list = await prisma.memberList.findUnique({ where: { id: listId } });
  if (!list) {
    return NextResponse.json({ error: "List not found." }, { status: 404 });
  }
  if (list.userId !== session.user.id) {
    return NextResponse.json({ error: "You can only edit your own lists." }, { status: 403 });
  }

  await prisma.memberListEntry.deleteMany({ where: { listId, movieId } });
  return NextResponse.json({ ok: true });
}
