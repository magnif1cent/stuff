import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseYoutubeUrl } from "@/lib/youtube";
import { MAX_FIGHT_SCENE_CAST } from "@/lib/fight-scenes";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; fightSceneId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { id: movieId, fightSceneId } = await params;
  const existing = await prisma.fightScene.findUnique({ where: { id: fightSceneId } });
  if (!existing || existing.movieId !== movieId || existing.isDeleted) {
    return NextResponse.json({ error: "Fight scene not found." }, { status: 404 });
  }
  if (existing.submittedById !== session.user.id) {
    return NextResponse.json({ error: "You can only edit your own submissions." }, { status: 403 });
  }

  const { youtubeUrl, personIds } = await request.json();

  if (typeof youtubeUrl !== "string" || youtubeUrl.trim().length === 0) {
    return NextResponse.json({ error: "youtubeUrl is required." }, { status: 400 });
  }

  const parsed = parseYoutubeUrl(youtubeUrl.trim());
  if (!parsed) {
    return NextResponse.json({ error: "That doesn't look like a valid YouTube link." }, { status: 400 });
  }

  if (!Array.isArray(personIds) || personIds.length === 0 || !personIds.every((p) => typeof p === "string")) {
    return NextResponse.json({ error: "personIds must be a non-empty array of actor ids." }, { status: 400 });
  }

  const uniquePersonIds = [...new Set(personIds)];
  if (uniquePersonIds.length > MAX_FIGHT_SCENE_CAST) {
    return NextResponse.json(
      { error: `A fight scene can list at most ${MAX_FIGHT_SCENE_CAST} actors.` },
      { status: 400 },
    );
  }

  const castCount = await prisma.castCredit.count({
    where: { movieId, personId: { in: uniquePersonIds } },
  });
  if (castCount !== uniquePersonIds.length) {
    return NextResponse.json(
      { error: "All actors must be part of this movie's cast." },
      { status: 400 },
    );
  }

  const fightScene = await prisma.$transaction(async (tx) => {
    await tx.fightSceneCast.deleteMany({ where: { fightSceneId } });
    return tx.fightScene.update({
      where: { id: fightSceneId },
      data: {
        youtubeVideoId: parsed.videoId,
        youtubeStartSeconds: parsed.startSeconds,
        // Content changed, so an earlier admin verification no longer
        // vouches for what's actually there — require re-review.
        isVerified: false,
        cast: {
          create: uniquePersonIds.map((personId, order) => ({ personId, order })),
        },
      },
      include: {
        submittedBy: { select: { name: true, image: true } },
        cast: { orderBy: { order: "asc" }, include: { person: true } },
      },
    });
  });

  return NextResponse.json({ fightScene });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; fightSceneId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { id: movieId, fightSceneId } = await params;
  const existing = await prisma.fightScene.findUnique({ where: { id: fightSceneId } });
  if (!existing || existing.movieId !== movieId) {
    return NextResponse.json({ error: "Fight scene not found." }, { status: 404 });
  }

  const isOwner = existing.submittedById === session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Soft-delete like discussion posts: keep the row (and other members'
  // ratings on it) intact rather than cascading them away.
  await prisma.fightScene.update({
    where: { id: fightSceneId },
    data: { isDeleted: true },
  });

  return NextResponse.json({ ok: true });
}
