import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isEmailVerified } from "@/lib/verification";
import { checkRateLimit, forumThreadCreateLimiter } from "@/lib/rate-limit";
import { MAX_FORUM_POST_LENGTH, MAX_THREAD_TITLE_LENGTH } from "@/lib/forum";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in to start a thread." }, { status: 401 });
  }
  if (!(await isEmailVerified(session.user.id))) {
    return NextResponse.json({ error: "Verify your email before posting in the forum." }, { status: 403 });
  }

  const rateLimit = await checkRateLimit(forumThreadCreateLimiter, session.user.id);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "You're posting too quickly. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  const { categoryId, title, content } = await request.json();

  if (typeof categoryId !== "string" || categoryId.trim().length === 0) {
    return NextResponse.json({ error: "categoryId is required." }, { status: 400 });
  }
  const category = await prisma.forumCategory.findUnique({ where: { id: categoryId } });
  if (!category) {
    return NextResponse.json({ error: "Invalid categoryId." }, { status: 400 });
  }

  if (typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json({ error: "title is required." }, { status: 400 });
  }
  const trimmedTitle = title.trim();
  if (trimmedTitle.length > MAX_THREAD_TITLE_LENGTH) {
    return NextResponse.json(
      { error: `title must be ${MAX_THREAD_TITLE_LENGTH} characters or fewer.` },
      { status: 400 },
    );
  }

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

  const thread = await prisma.forumThread.create({
    data: {
      categoryId,
      authorId: session.user.id,
      title: trimmedTitle,
      posts: { create: { authorId: session.user.id, content: trimmedContent } },
    },
    include: { category: { select: { slug: true } } },
  });

  return NextResponse.json({ thread });
}
