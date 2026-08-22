import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isEmailVerified } from "@/lib/verification";
import { MAX_PERSON_FUN_FACT_LENGTH } from "@/lib/person-fun-facts";
import { checkRateLimit, personFunFactSubmitLimiter } from "@/lib/rate-limit";

export async function POST(request: Request, { params }: { params: Promise<{ personId: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in to add a fun fact." }, { status: 401 });
  }
  if (!(await isEmailVerified(session.user.id))) {
    return NextResponse.json({ error: "Verify your email before adding a fun fact." }, { status: 403 });
  }

  const rateLimit = await checkRateLimit(personFunFactSubmitLimiter, session.user.id);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "You're adding facts too quickly. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  const { personId } = await params;
  const { content } = await request.json();

  if (typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json({ error: "content is required." }, { status: 400 });
  }
  const trimmedContent = content.trim();
  if (trimmedContent.length > MAX_PERSON_FUN_FACT_LENGTH) {
    return NextResponse.json(
      { error: `content must be ${MAX_PERSON_FUN_FACT_LENGTH} characters or fewer.` },
      { status: 400 },
    );
  }

  const person = await prisma.person.findUnique({ where: { id: personId }, select: { id: true } });
  if (!person) {
    return NextResponse.json({ error: "Actor not found." }, { status: 404 });
  }

  const fact = await prisma.personFunFact.create({
    data: { personId, submittedById: session.user.id, content: trimmedContent },
    include: { submittedBy: { select: { username: true } } },
  });

  return NextResponse.json({ fact });
}
