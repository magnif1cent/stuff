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
    return NextResponse.json({ error: "Sign in to manage your favorites." }, { status: 401 });
  }
  if (!(await isEmailVerified(session.user.id))) {
    return NextResponse.json({ error: "Verify your email before managing favorites." }, { status: 403 });
  }

  const { id: movieId, fightSceneId } = await params;

  const scene = await prisma.fightScene.findUnique({ where: { id: fightSceneId } });
  if (!scene || scene.movieId !== movieId || scene.isDeleted) {
    return NextResponse.json({ error: "Fight scene not found." }, { status: 404 });
  }

  const existing = await prisma.fightSceneFavorite.findUnique({
    where: { userId_fightSceneId: { userId: session.user.id, fightSceneId } },
  });

  if (existing) {
    await prisma.fightSceneFavorite.delete({ where: { id: existing.id } });
    return NextResponse.json({ active: false });
  }

  await prisma.fightSceneFavorite.create({ data: { userId: session.user.id, fightSceneId } });
  return NextResponse.json({ active: true });
}
