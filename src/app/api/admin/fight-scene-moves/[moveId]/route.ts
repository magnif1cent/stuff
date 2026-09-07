import { NextResponse } from "next/server";
import { requireReviewerSession } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";
import { MAX_FIGHT_SCENE_MOVE_NAME_LENGTH } from "@/lib/fight-scenes";

export async function PATCH(request: Request, { params }: { params: Promise<{ moveId: string }> }) {
  const session = await requireReviewerSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { moveId } = await params;
  const existing = await prisma.fightSceneMove.findUnique({ where: { id: moveId } });
  if (!existing) {
    return NextResponse.json({ error: "Move not found." }, { status: 404 });
  }

  const { name } = await request.json();
  if (typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "name is required." }, { status: 400 });
  }
  const trimmedName = name.trim();
  if (trimmedName.length > MAX_FIGHT_SCENE_MOVE_NAME_LENGTH) {
    return NextResponse.json(
      { error: `name must be ${MAX_FIGHT_SCENE_MOVE_NAME_LENGTH} characters or fewer.` },
      { status: 400 },
    );
  }

  const nameTaken = await prisma.fightSceneMove.findFirst({ where: { name: trimmedName, id: { not: moveId } } });
  if (nameTaken) {
    return NextResponse.json({ error: "A move with that name already exists." }, { status: 400 });
  }

  const move = await prisma.fightSceneMove.update({ where: { id: moveId }, data: { name: trimmedName } });
  return NextResponse.json({ move });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ moveId: string }> }) {
  const session = await requireReviewerSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { moveId } = await params;
  const existing = await prisma.fightSceneMove.findUnique({ where: { id: moveId } });
  if (!existing) {
    return NextResponse.json({ error: "Move not found." }, { status: 404 });
  }

  // Hard-delete is fine here (unlike fight scenes/discussion posts): a move
  // carries no history worth preserving, it just drops out of scenes that
  // used it via the implicit join table's cascade.
  await prisma.fightSceneMove.delete({ where: { id: moveId } });
  return NextResponse.json({ ok: true });
}
