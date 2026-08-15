import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function isModerator(role: string | undefined) {
  return role === "ADMIN" || role === "REVIEWER";
}

// Pin/lock only — moderator-only, unlike DELETE below which an author can
// also do to their own thread.
export async function PATCH(request: Request, { params }: { params: Promise<{ threadId: string }> }) {
  const session = await auth();
  if (!session?.user || !isModerator(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { threadId } = await params;
  const existing = await prisma.forumThread.findUnique({ where: { id: threadId } });
  if (!existing || existing.isDeleted) {
    return NextResponse.json({ error: "Thread not found." }, { status: 404 });
  }

  const { isPinned, isLocked } = await request.json();
  const data: { isPinned?: boolean; isLocked?: boolean } = {};
  if (typeof isPinned === "boolean") data.isPinned = isPinned;
  if (typeof isLocked === "boolean") data.isLocked = isLocked;
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "isPinned or isLocked is required." }, { status: 400 });
  }

  const thread = await prisma.forumThread.update({ where: { id: threadId }, data });
  return NextResponse.json({ thread });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ threadId: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { threadId } = await params;
  const existing = await prisma.forumThread.findUnique({ where: { id: threadId } });
  if (!existing || existing.isDeleted) {
    return NextResponse.json({ error: "Thread not found." }, { status: 404 });
  }

  const isOwner = existing.authorId === session.user.id;
  if (!isOwner && !isModerator(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Soft-delete the thread itself; its posts are left as-is (same as a
  // DiscussionPost's replies surviving its parent's soft-delete) — the
  // thread page checks isDeleted and the category listing filters it out.
  await prisma.forumThread.update({ where: { id: threadId }, data: { isDeleted: true } });

  return NextResponse.json({ ok: true });
}
