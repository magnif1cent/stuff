import { NextResponse } from "next/server";
import { requireReviewerSession } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";
import { MAX_FIGHT_SCENE_TAG_NAME_LENGTH } from "@/lib/fight-scenes";

export async function GET() {
  const session = await requireReviewerSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tags = await prisma.fightSceneTag.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { fightScenes: true } } },
  });
  return NextResponse.json({ tags });
}

export async function POST(request: Request) {
  const session = await requireReviewerSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name } = await request.json();
  if (typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "name is required." }, { status: 400 });
  }
  const trimmedName = name.trim();
  if (trimmedName.length > MAX_FIGHT_SCENE_TAG_NAME_LENGTH) {
    return NextResponse.json(
      { error: `name must be ${MAX_FIGHT_SCENE_TAG_NAME_LENGTH} characters or fewer.` },
      { status: 400 },
    );
  }

  // Case-insensitive so an admin can't accidentally create "weapon duel"
  // alongside an existing "Weapon Duel" -- same check the member-facing
  // create endpoint uses, just rejecting instead of silently reusing since
  // an admin is explicitly curating the vocabulary here.
  const existing = await prisma.fightSceneTag.findFirst({
    where: { name: { equals: trimmedName, mode: "insensitive" } },
  });
  if (existing) {
    return NextResponse.json({ error: "A tag with that name already exists." }, { status: 400 });
  }

  const tag = await prisma.fightSceneTag.create({ data: { name: trimmedName } });
  return NextResponse.json({ tag: { ...tag, _count: { fightScenes: 0 } } });
}
