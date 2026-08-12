import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";
import { MAX_NEWS_TITLE_LENGTH, MAX_NEWS_CONTENT_LENGTH } from "@/lib/news";

export async function PATCH(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { postId } = await params;
  const existing = await prisma.newsPost.findUnique({ where: { id: postId } });
  if (!existing) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  const { title, content } = await request.json();
  if (typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json({ error: "title is required." }, { status: 400 });
  }
  const trimmedTitle = title.trim();
  if (trimmedTitle.length > MAX_NEWS_TITLE_LENGTH) {
    return NextResponse.json(
      { error: `title must be ${MAX_NEWS_TITLE_LENGTH} characters or fewer.` },
      { status: 400 },
    );
  }

  if (typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json({ error: "content is required." }, { status: 400 });
  }
  const trimmedContent = content.trim();
  if (trimmedContent.length > MAX_NEWS_CONTENT_LENGTH) {
    return NextResponse.json(
      { error: `content must be ${MAX_NEWS_CONTENT_LENGTH} characters or fewer.` },
      { status: 400 },
    );
  }

  // Any admin can edit any post (mirrors EditorialReview), so this doesn't
  // check existing.authorId against the current session.
  const post = await prisma.newsPost.update({
    where: { id: postId },
    data: { title: trimmedTitle, content: trimmedContent },
    include: { author: { select: { username: true } } },
  });
  return NextResponse.json({ post });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { postId } = await params;
  const existing = await prisma.newsPost.findUnique({ where: { id: postId } });
  if (!existing) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  // Hard-delete is fine here (unlike fight scenes/discussion posts): a news
  // post carries no history worth preserving and nothing else references it.
  await prisma.newsPost.delete({ where: { id: postId } });
  return NextResponse.json({ ok: true });
}
