import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDiscussionPage, MAX_DISCUSSION_CONTENT_LENGTH } from "@/lib/discussion";
import { isEmailVerified } from "@/lib/verification";

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

  if (parentId != null) {
    const parent = await prisma.discussionPost.findUnique({ where: { id: parentId } });
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
    include: { user: { select: { name: true, image: true } } },
  });

  return NextResponse.json({ post });
}
