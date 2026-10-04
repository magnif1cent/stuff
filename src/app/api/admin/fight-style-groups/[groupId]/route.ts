import { NextResponse } from "next/server";
import { requireReviewerSession } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";
import { MAX_FIGHT_STYLE_GROUP_NAME_LENGTH } from "@/lib/fight-scenes";

export async function PATCH(request: Request, { params }: { params: Promise<{ groupId: string }> }) {
  const session = await requireReviewerSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { groupId } = await params;
  const existing = await prisma.fightStyleGroup.findUnique({ where: { id: groupId } });
  if (!existing) {
    return NextResponse.json({ error: "Group not found." }, { status: 404 });
  }

  const { name } = await request.json();
  if (typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "name is required." }, { status: 400 });
  }
  const trimmedName = name.trim();
  if (trimmedName.length > MAX_FIGHT_STYLE_GROUP_NAME_LENGTH) {
    return NextResponse.json(
      { error: `name must be ${MAX_FIGHT_STYLE_GROUP_NAME_LENGTH} characters or fewer.` },
      { status: 400 },
    );
  }

  const nameTaken = await prisma.fightStyleGroup.findFirst({ where: { name: trimmedName, id: { not: groupId } } });
  if (nameTaken) {
    return NextResponse.json({ error: "A group with that name already exists." }, { status: 400 });
  }

  const group = await prisma.fightStyleGroup.update({ where: { id: groupId }, data: { name: trimmedName } });
  return NextResponse.json({ group });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ groupId: string }> }) {
  const session = await requireReviewerSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { groupId } = await params;
  const existing = await prisma.fightStyleGroup.findUnique({ where: { id: groupId } });
  if (!existing) {
    return NextResponse.json({ error: "Group not found." }, { status: 404 });
  }

  // Deleting a group only ungroups its styles (groupId -> null via the
  // schema's onDelete: SetNull) — the styles themselves, and any fight
  // scenes tagged with them, are untouched.
  await prisma.fightStyleGroup.delete({ where: { id: groupId } });
  return NextResponse.json({ ok: true });
}
