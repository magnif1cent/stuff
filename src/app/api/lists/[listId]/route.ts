import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MEMBER_LIST_NAME_MAX_LENGTH } from "@/lib/member-lists";

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
    return NextResponse.json({ error: "You can only rename your own lists." }, { status: 403 });
  }

  const { name, isPublic } = await request.json();
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

  // Same ADMIN-only restriction as creating a private list -- flipping an
  // existing list's visibility is no less privileged than setting it up
  // front.
  if (typeof isPublic === "boolean" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Only admins can change a list's visibility." }, { status: 403 });
  }

  const nameTaken = await prisma.memberList.findUnique({
    where: { userId_name: { userId: session.user.id, name: trimmedName } },
  });
  if (nameTaken && nameTaken.id !== listId) {
    return NextResponse.json({ error: "You already have a list with that name." }, { status: 409 });
  }

  const list = await prisma.memberList.update({
    where: { id: listId },
    data: { name: trimmedName, ...(typeof isPublic === "boolean" ? { isPublic } : {}) },
  });
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
