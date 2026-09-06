import { NextResponse } from "next/server";
import { requireReviewerSession } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";
import { MAX_FIGHT_SCENE_STYLE_NAME_LENGTH } from "@/lib/fight-scenes";

export async function PATCH(request: Request, { params }: { params: Promise<{ styleId: string }> }) {
  const session = await requireReviewerSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { styleId } = await params;
  const existing = await prisma.fightSceneStyle.findUnique({ where: { id: styleId } });
  if (!existing) {
    return NextResponse.json({ error: "Style not found." }, { status: 404 });
  }

  const { name } = await request.json();
  if (typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "name is required." }, { status: 400 });
  }
  const trimmedName = name.trim();
  if (trimmedName.length > MAX_FIGHT_SCENE_STYLE_NAME_LENGTH) {
    return NextResponse.json(
      { error: `name must be ${MAX_FIGHT_SCENE_STYLE_NAME_LENGTH} characters or fewer.` },
      { status: 400 },
    );
  }

  const nameTaken = await prisma.fightSceneStyle.findFirst({ where: { name: trimmedName, id: { not: styleId } } });
  if (nameTaken) {
    return NextResponse.json({ error: "A style with that name already exists." }, { status: 400 });
  }

  const style = await prisma.fightSceneStyle.update({ where: { id: styleId }, data: { name: trimmedName } });
  return NextResponse.json({ style });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ styleId: string }> }) {
  const session = await requireReviewerSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { styleId } = await params;
  const existing = await prisma.fightSceneStyle.findUnique({ where: { id: styleId } });
  if (!existing) {
    return NextResponse.json({ error: "Style not found." }, { status: 404 });
  }

  // Hard-delete is fine here (unlike fight scenes/discussion posts): a style
  // carries no history worth preserving, it just drops out of scenes that
  // used it via the implicit join table's cascade.
  await prisma.fightSceneStyle.delete({ where: { id: styleId } });
  return NextResponse.json({ ok: true });
}
