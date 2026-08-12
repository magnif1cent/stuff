import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";
import { MAX_NEWS_TITLE_LENGTH, MAX_NEWS_CONTENT_LENGTH } from "@/lib/news";

export async function POST(request: Request) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

  const post = await prisma.newsPost.create({
    data: { title: trimmedTitle, content: trimmedContent, authorId: session.user.id },
    include: { author: { select: { username: true } } },
  });
  return NextResponse.json({ post });
}
