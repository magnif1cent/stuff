import { NextResponse } from "next/server";
import { requireReviewerSession } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";
import { MAX_FIGHT_STYLE_GROUP_NAME_LENGTH } from "@/lib/fight-scenes";

export async function GET() {
  const session = await requireReviewerSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const groups = await prisma.fightStyleGroup.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { styles: true } } },
  });
  return NextResponse.json({ groups });
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
  if (trimmedName.length > MAX_FIGHT_STYLE_GROUP_NAME_LENGTH) {
    return NextResponse.json(
      { error: `name must be ${MAX_FIGHT_STYLE_GROUP_NAME_LENGTH} characters or fewer.` },
      { status: 400 },
    );
  }

  const existing = await prisma.fightStyleGroup.findFirst({
    where: { name: { equals: trimmedName, mode: "insensitive" } },
  });
  if (existing) {
    return NextResponse.json({ error: "A group with that name already exists." }, { status: 400 });
  }

  const group = await prisma.fightStyleGroup.create({ data: { name: trimmedName } });
  return NextResponse.json({ group: { ...group, _count: { styles: 0 } } });
}
