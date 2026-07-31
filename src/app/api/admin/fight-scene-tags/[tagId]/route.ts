import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";

const MAX_TAG_NAME_LENGTH = 40;

export async function PATCH(request: Request, { params }: { params: Promise<{ tagId: string }> }) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { tagId } = await params;
  const existing = await prisma.fightSceneTag.findUnique({ where: { id: tagId } });
  if (!existing) {
    return NextResponse.json({ error: "Tag not found." }, { status: 404 });
  }

  const { name } = await request.json();
  if (typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "name is required." }, { status: 400 });
  }
  const trimmedName = name.trim();
  if (trimmedName.length > MAX_TAG_NAME_LENGTH) {
    return NextResponse.json(
      { error: `name must be ${MAX_TAG_NAME_LENGTH} characters or fewer.` },
      { status: 400 },
    );
  }

  const nameTaken = await prisma.fightSceneTag.findFirst({ where: { name: trimmedName, id: { not: tagId } } });
  if (nameTaken) {
    return NextResponse.json({ error: "A tag with that name already exists." }, { status: 400 });
  }

  const tag = await prisma.fightSceneTag.update({ where: { id: tagId }, data: { name: trimmedName } });
  return NextResponse.json({ tag });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ tagId: string }> }) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { tagId } = await params;
  const existing = await prisma.fightSceneTag.findUnique({ where: { id: tagId } });
  if (!existing) {
    return NextResponse.json({ error: "Tag not found." }, { status: 404 });
  }

  // Hard-delete is fine here (unlike fight scenes/discussion posts): a tag
  // carries no history worth preserving, it just drops out of scenes that
  // used it via the implicit join table's cascade.
  await prisma.fightSceneTag.delete({ where: { id: tagId } });
  return NextResponse.json({ ok: true });
}
