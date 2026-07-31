import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";

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

  const { verified } = await request.json();
  if (typeof verified !== "boolean") {
    return NextResponse.json({ error: "verified must be a boolean." }, { status: 400 });
  }

  const fightScene = await prisma.fightScene.update({
    where: { id: fightSceneId },
    data: { isVerified: verified },
  });

  return NextResponse.json({ fightScene });
}
