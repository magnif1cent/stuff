import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";

const MAX_NOTE_LENGTH = 2000;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; fightSceneId: string }> },
) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: movieId, fightSceneId } = await params;
  const existing = await prisma.fightScene.findUnique({ where: { id: fightSceneId } });
  if (!existing || existing.movieId !== movieId || existing.isDeleted) {
    return NextResponse.json({ error: "Fight scene not found." }, { status: 404 });
  }

  const { score, note } = await request.json();
  if (typeof score !== "number" || !Number.isInteger(score) || score < 1 || score > 10) {
    return NextResponse.json({ error: "score must be an integer between 1 and 10." }, { status: 400 });
  }
  if (typeof note === "string" && note.length > MAX_NOTE_LENGTH) {
    return NextResponse.json(
      { error: `note must be ${MAX_NOTE_LENGTH} characters or fewer.` },
      { status: 400 },
    );
  }

  const normalizedNote = typeof note === "string" && note.trim() ? note.trim() : null;

  const rating = await prisma.fightSceneAdminRating.upsert({
    where: { adminId_fightSceneId: { adminId: session.user.id, fightSceneId } },
    update: { score, note: normalizedNote },
    create: { adminId: session.user.id, fightSceneId, score, note: normalizedNote },
  });

  return NextResponse.json({ rating });
}
