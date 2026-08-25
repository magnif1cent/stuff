import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MEMBER_LIST_DESCRIPTION_MAX_LENGTH, MEMBER_LIST_NAME_MAX_LENGTH } from "@/lib/member-lists";

// Handles renaming and/or updating description/isRanked in one call — all
// three live in the same "Edit list" panel on the list's own page, so a
// save there is one request, not three. Every field is optional; only the
// ones present in the body are validated and written.
export async function PATCH(request: Request, { params }: { params: Promise<{ listId: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { listId } = await params;
  const existing = await prisma.memberList.findUnique({ where: { id: listId } });
  if (!existing) {
    return NextResponse.json({ error: "List not found." }, { status: 404 });
  }
  if (existing.userId !== session.user.id) {
    return NextResponse.json({ error: "You can only edit your own lists." }, { status: 403 });
  }

  const { name, description, isRanked } = await request.json();
  const data: { name?: string; description?: string | null; isRanked?: boolean } = {};

  if (name !== undefined) {
    if (typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "A list name is required." }, { status: 400 });
    }
    const trimmedName = name.trim();
    if (trimmedName.length > MEMBER_LIST_NAME_MAX_LENGTH) {
      return NextResponse.json(
        { error: `List name must be ${MEMBER_LIST_NAME_MAX_LENGTH} characters or fewer.` },
        { status: 400 },
      );
    }
    const nameTaken = await prisma.memberList.findUnique({
      where: { userId_name: { userId: session.user.id, name: trimmedName } },
    });
    if (nameTaken && nameTaken.id !== listId) {
      return NextResponse.json({ error: "You already have a list with that name." }, { status: 409 });
    }
    data.name = trimmedName;
  }

  if (description !== undefined) {
    if (description !== null && typeof description !== "string") {
      return NextResponse.json({ error: "description must be a string or null." }, { status: 400 });
    }
    const trimmedDescription = typeof description === "string" ? description.trim() : null;
    if (trimmedDescription && trimmedDescription.length > MEMBER_LIST_DESCRIPTION_MAX_LENGTH) {
      return NextResponse.json(
        { error: `Description must be ${MEMBER_LIST_DESCRIPTION_MAX_LENGTH} characters or fewer.` },
        { status: 400 },
      );
    }
    data.description = trimmedDescription || null;
  }

  if (isRanked !== undefined) {
    if (typeof isRanked !== "boolean") {
      return NextResponse.json({ error: "isRanked must be a boolean." }, { status: 400 });
    }
    data.isRanked = isRanked;
  }

  const list = await prisma.memberList.update({ where: { id: listId }, data });
  return NextResponse.json({ list });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ listId: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { listId } = await params;
  const existing = await prisma.memberList.findUnique({ where: { id: listId } });
  if (!existing) {
    return NextResponse.json({ error: "List not found." }, { status: 404 });
  }
  if (existing.userId !== session.user.id) {
    return NextResponse.json({ error: "You can only delete your own lists." }, { status: 403 });
  }

  await prisma.memberList.delete({ where: { id: listId } });
  return NextResponse.json({ ok: true });
}
