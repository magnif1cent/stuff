import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";
import { MAX_PERSON_SPOTLIGHT_LENGTH } from "@/lib/person-spotlights";

export async function POST(request: Request, { params }: { params: Promise<{ personId: string }> }) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { personId } = await params;
  const { content } = await request.json();

  if (typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json({ error: "content is required." }, { status: 400 });
  }
  const trimmedContent = content.trim();
  if (trimmedContent.length > MAX_PERSON_SPOTLIGHT_LENGTH) {
    return NextResponse.json(
      { error: `content must be ${MAX_PERSON_SPOTLIGHT_LENGTH} characters or fewer.` },
      { status: 400 },
    );
  }

  const person = await prisma.person.findUnique({ where: { id: personId }, select: { id: true } });
  if (!person) {
    return NextResponse.json({ error: "Actor not found." }, { status: 404 });
  }

  // One spotlight per actor (not per-admin) -- any admin can write or
  // update it; authorId just tracks who last touched it. Same shape as
  // EditorialReview's upsert.
  const spotlight = await prisma.personSpotlight.upsert({
    where: { personId },
    update: { content: trimmedContent, authorId: session.user.id },
    create: { personId, authorId: session.user.id, content: trimmedContent },
    include: { author: { select: { username: true } } },
  });

  return NextResponse.json({ spotlight });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ personId: string }> }) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { personId } = await params;

  // Unlike EditorialReview (no removal path), a spotlight also functions as
  // a badge -- admins need to be able to un-spotlight an actor, not just
  // overwrite the blurb.
  await prisma.personSpotlight.deleteMany({ where: { personId } });

  return NextResponse.json({ ok: true });
}
