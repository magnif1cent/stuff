import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getForumPostPage, MAX_FORUM_POST_LENGTH } from "@/lib/forum";
import { isEmailVerified } from "@/lib/verification";
import { checkRateLimit, forumPostLimiter } from "@/lib/rate-limit";

export async function GET(request: Request, { params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params;
  const cursor = new URL(request.url).searchParams.get("cursor");

  const { posts, nextCursor } = await getForumPostPage(threadId, cursor);
  return NextResponse.json({ posts, nextCursor });
}

export async function POST(request: Request, { params }: { params: Promise<{ threadId: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in to post in the forum." }, { status: 401 });
  }
  if (!(await isEmailVerified(session.user.id))) {
    return NextResponse.json({ error: "Verify your email before posting in the forum." }, { status: 403 });
  }

  const rateLimit = await checkRateLimit(forumPostLimiter, session.user.id);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "You're posting too quickly. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  const { threadId } = await params;
  const thread = await prisma.forumThread.findUnique({ where: { id: threadId } });
  if (!thread || thread.isDeleted) {
    return NextResponse.json({ error: "Thread not found." }, { status: 404 });
  }
  if (thread.isLocked) {
    return NextResponse.json({ error: "This thread is locked." }, { status: 403 });
  }

  const { content, parentId } = await request.json();

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

  if (parentId != null) {
    const parent = await prisma.forumPost.findUnique({ where: { id: parentId } });
    if (!parent || parent.threadId !== threadId) {
      return NextResponse.json({ error: "Invalid parentId." }, { status: 400 });
    }
    if (parent.parentId !== null) {
      return NextResponse.json({ error: "Replies can only be posted on top-level forum posts." }, { status: 400 });
    }
  }

  const post = await prisma.forumPost.create({
    data: {
      threadId,
      authorId: session.user.id,
      content: trimmedContent,
      parentId: typeof parentId === "string" ? parentId : null,
    },
    include: { author: { select: { username: true, image: true } } },
  });

  // Bumps the thread's own updatedAt so category listings (sorted by
  // updatedAt desc) surface recently-active threads, not just recently
  // created ones.
  await prisma.forumThread.update({ where: { id: threadId }, data: { updatedAt: new Date() } });

  return NextResponse.json({ post });
}
