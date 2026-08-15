import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDiscussionPage, MAX_DISCUSSION_CONTENT_LENGTH } from "@/lib/discussion";
import { isEmailVerified } from "@/lib/verification";
import { checkRateLimit, discussionPostLimiter } from "@/lib/rate-limit";
import { createNotification } from "@/lib/notifications";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: movieId } = await params;
  const cursor = new URL(request.url).searchParams.get("cursor");

  const { posts, nextCursor } = await getDiscussionPage(movieId, cursor);
  return NextResponse.json({ posts, nextCursor });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in to join the discussion." }, { status: 401 });
  }
  if (!(await isEmailVerified(session.user.id))) {
    return NextResponse.json({ error: "Verify your email before posting in discussions." }, { status: 403 });
  }

  const rateLimit = await checkRateLimit(discussionPostLimiter, session.user.id);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "You're posting too quickly. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  const { id: movieId } = await params;
  const { content, parentId } = await request.json();

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

  let parent: Awaited<ReturnType<typeof prisma.discussionPost.findUnique>> = null;
  if (parentId != null) {
    parent = await prisma.discussionPost.findUnique({ where: { id: parentId } });
    if (!parent || parent.movieId !== movieId) {
      return NextResponse.json({ error: "Invalid parentId." }, { status: 400 });
    }
    if (parent.parentId !== null) {
      return NextResponse.json(
        { error: "Replies can only be posted on top-level discussion posts." },
        { status: 400 },
      );
    }
  }

  const post = await prisma.discussionPost.create({
    data: {
      movieId,
      userId: session.user.id,
      content: trimmedContent,
      parentId: typeof parentId === "string" ? parentId : null,
    },
    include: { user: { select: { username: true, image: true } } },
  });

  if (parent && parent.userId !== session.user.id) {
    const movie = await prisma.movie.findUnique({ where: { id: movieId }, select: { title: true } });
    await createNotification({
      recipientId: parent.userId,
      type: "REPLY",
      message: `${session.user.username} replied to your post on "${movie?.title ?? "a movie"}"`,
      link: `/movies/${movieId}#discussion`,
    });
  }

  return NextResponse.json({ post });
}
