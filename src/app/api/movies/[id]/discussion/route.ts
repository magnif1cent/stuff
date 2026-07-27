import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: movieId } = await params;

  const posts = await prisma.discussionPost.findMany({
    where: { movieId, parentId: null },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, image: true } },
      replies: {
        orderBy: { createdAt: "asc" },
        include: { user: { select: { name: true, image: true } } },
      },
    },
  });

  return NextResponse.json({ posts });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in to join the discussion." }, { status: 401 });
  }

  const { id: movieId } = await params;
  const { content, parentId } = await request.json();

  if (typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json({ error: "content is required." }, { status: 400 });
  }

  if (parentId != null) {
    const parent = await prisma.discussionPost.findUnique({ where: { id: parentId } });
    if (!parent || parent.movieId !== movieId) {
      return NextResponse.json({ error: "Invalid parentId." }, { status: 400 });
    }
  }

  const post = await prisma.discussionPost.create({
    data: {
      movieId,
      userId: session.user.id,
      content: content.trim(),
      parentId: typeof parentId === "string" ? parentId : null,
    },
    include: { user: { select: { name: true, image: true } } },
  });

  return NextResponse.json({ post });
}
