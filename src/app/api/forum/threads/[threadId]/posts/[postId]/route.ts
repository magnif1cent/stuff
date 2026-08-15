import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MAX_FORUM_POST_LENGTH } from "@/lib/forum";

function isModerator(role: string | undefined) {
  return role === "ADMIN" || role === "REVIEWER";
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ threadId: string; postId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { threadId, postId } = await params;
  const existing = await prisma.forumPost.findUnique({ where: { id: postId } });
  if (!existing || existing.threadId !== threadId) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }
  if (existing.authorId !== session.user.id) {
    return NextResponse.json({ error: "You can only edit your own posts." }, { status: 403 });
  }
  if (existing.isDeleted) {
    return NextResponse.json({ error: "This post has been deleted." }, { status: 400 });
  }

  const { content } = await request.json();
  if (typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json({ error: "content is required." }, { status: 400 });
  }
  const trimmedContent = content.trim();
  if (trimmedContent.length > MAX_FORUM_POST_LENGTH) {
    return NextResponse.json(
      { error: `content must be ${MAX_FORUM_POST_LENGTH} characters or fewer.` },
      { status: 400 },
    );
  }

  const post = await prisma.forumPost.update({
    where: { id: postId },
    data: { content: trimmedContent },
    include: { author: { select: { username: true, image: true } } },
  });

  return NextResponse.json({ post });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ threadId: string; postId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { threadId, postId } = await params;
  const existing = await prisma.forumPost.findUnique({ where: { id: postId } });
  if (!existing || existing.threadId !== threadId) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  const isOwner = existing.authorId === session.user.id;
  if (!isOwner && !isModerator(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Soft-delete, same as DiscussionPost: keep the row (and any replies
  // hanging off it) intact, just blank the content and flag it.
  await prisma.forumPost.update({ where: { id: postId }, data: { isDeleted: true, content: "" } });

  return NextResponse.json({ ok: true });
}
