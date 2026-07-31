import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isEmailVerified } from "@/lib/verification";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; fightSceneId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in to rate fight scenes." }, { status: 401 });
  }
  if (!(await isEmailVerified(session.user.id))) {
    return NextResponse.json({ error: "Verify your email before rating fight scenes." }, { status: 403 });
  }

  const { id: movieId, fightSceneId } = await params;
  const existing = await prisma.fightScene.findUnique({ where: { id: fightSceneId } });
  if (!existing || existing.movieId !== movieId || existing.isDeleted) {
    return NextResponse.json({ error: "Fight scene not found." }, { status: 404 });
  }

  const { score } = await request.json();
  if (typeof score !== "number" || !Number.isInteger(score) || score < 1 || score > 10) {
    return NextResponse.json({ error: "score must be an integer between 1 and 10." }, { status: 400 });
  }

  const rating = await prisma.fightSceneRating.upsert({
    where: { userId_fightSceneId: { userId: session.user.id, fightSceneId } },
    update: { score },
    create: { userId: session.user.id, fightSceneId, score },
  });

  return NextResponse.json({ rating });
}
