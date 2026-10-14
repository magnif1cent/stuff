import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";
import { MAX_SPOTLIGHT_BLURB_LENGTH, getCurrentSpotlight } from "@/lib/actor-spotlight";

// Feature an actor on the homepage, or update the current pick's blurb.
// Picking a different actor ends the current spotlight (endedAt) rather than
// deleting it, so past picks stay on record.
export async function POST(request: Request) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { personId, blurb } = await request.json();
  if (typeof personId !== "string" || personId.length === 0) {
    return NextResponse.json({ error: "personId is required." }, { status: 400 });
  }
  if (blurb !== undefined && blurb !== null && typeof blurb !== "string") {
    return NextResponse.json({ error: "blurb must be a string." }, { status: 400 });
  }
  const trimmedBlurb = typeof blurb === "string" ? blurb.trim() : "";
  if (trimmedBlurb.length > MAX_SPOTLIGHT_BLURB_LENGTH) {
    return NextResponse.json(
      { error: `blurb must be ${MAX_SPOTLIGHT_BLURB_LENGTH} characters or fewer.` },
      { status: 400 },
    );
  }

  const person = await prisma.person.findUnique({ where: { id: personId }, select: { id: true } });
  if (!person) {
    return NextResponse.json({ error: "Actor not found." }, { status: 404 });
  }

  const current = await getCurrentSpotlight();
  if (current?.personId === personId) {
    await prisma.actorSpotlight.update({ where: { id: current.id }, data: { blurb: trimmedBlurb || null } });
  } else {
    await prisma.$transaction([
      prisma.actorSpotlight.updateMany({ where: { endedAt: null }, data: { endedAt: new Date() } }),
      prisma.actorSpotlight.create({
        data: { personId, blurb: trimmedBlurb || null, createdById: session.user.id },
      }),
    ]);
  }
  return NextResponse.json({ ok: true });
}

// Take the spotlight off the homepage without picking a replacement.
export async function DELETE() {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await prisma.actorSpotlight.updateMany({ where: { endedAt: null }, data: { endedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
