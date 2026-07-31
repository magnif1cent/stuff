import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MAX_DISCUSSION_CONTENT_LENGTH } from "@/lib/discussion";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; postId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { id: movieId, postId } = await params;
  const existing = await prisma.discussionPost.findUnique({ where: { id: postId } });
  if (!existing || existing.movieId !== movieId) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }
  if (existing.userId !== session.user.id) {
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
  if (trimmedContent.length > MAX_DISCUSSION_CONTENT_LENGTH) {
    return NextResponse.json(
      { error: `content must be ${MAX_DISCUSSION_CONTENT_LENGTH} characters or fewer.` },
      { status: 400 },
    );
  }

  const post = await prisma.discussionPost.update({
    where: { id: postId },
    data: { content: trimmedContent },
    include: { user: { select: { name: true, image: true } } },
  });

  return NextResponse.json({ post });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; postId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { id: movieId, postId } = await params;
  const existing = await prisma.discussionPost.findUnique({ where: { id: postId } });
  if (!existing || existing.movieId !== movieId) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  const isOwner = existing.userId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Soft-delete: keep the row (and any replies hanging off it) intact, just
  // blank the content and flag it, rather than hard-deleting and cascading
  // away replies other people wrote.
  await prisma.discussionPost.update({
    where: { id: postId },
    data: { isDeleted: true, content: "" },
  });

  return NextResponse.json({ ok: true });
}
