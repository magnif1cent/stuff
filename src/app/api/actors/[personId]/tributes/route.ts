import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isEmailVerified } from "@/lib/verification";
import { MAX_PERSON_TRIBUTE_LENGTH } from "@/lib/person-tributes";
import { checkRateLimit, personTributeSubmitLimiter } from "@/lib/rate-limit";

export async function POST(request: Request, { params }: { params: Promise<{ personId: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in to add a tribute." }, { status: 401 });
  }
  if (!(await isEmailVerified(session.user.id))) {
    return NextResponse.json({ error: "Verify your email before adding a tribute." }, { status: 403 });
  }

  const rateLimit = await checkRateLimit(personTributeSubmitLimiter, session.user.id);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "You're adding tributes too quickly. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  const { personId } = await params;
  const { content } = await request.json();

  if (typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json({ error: "content is required." }, { status: 400 });
  }
  const trimmedContent = content.trim();
  if (trimmedContent.length > MAX_PERSON_TRIBUTE_LENGTH) {
    return NextResponse.json(
      { error: `content must be ${MAX_PERSON_TRIBUTE_LENGTH} characters or fewer.` },
      { status: 400 },
    );
  }

  const person = await prisma.person.findUnique({ where: { id: personId }, select: { id: true } });
  if (!person) {
    return NextResponse.json({ error: "Actor not found." }, { status: 404 });
  }

  const existing = await prisma.personTribute.findUnique({
    where: { personId_authorId: { personId, authorId: session.user.id } },
  });
  if (existing) {
    return NextResponse.json(
      { error: "You've already written a tribute for this actor — edit your existing one instead." },
      { status: 409 },
    );
  }

  const tribute = await prisma.personTribute.create({
    data: { personId, authorId: session.user.id, content: trimmedContent },
    include: { author: { select: { username: true } } },
  });

  return NextResponse.json({ tribute });
}
