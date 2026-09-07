import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseAndValidateFightSceneInput } from "@/lib/fight-scenes";

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

  const body = await request.json();
  const result = await parseAndValidateFightSceneInput(movieId, body);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  const { title, videoId, personIds, tagIds, styleIds, moveIds } = result;

  const fightScene = await prisma.$transaction(async (tx) => {
    await tx.fightSceneCast.deleteMany({ where: { fightSceneId } });
    return tx.fightScene.update({
      where: { id: fightSceneId },
      data: {
        title,
        youtubeVideoId: videoId,
        // Start time is admin-only (set via the separate start-time
        // endpoint) — a submitter's edit here must not clobber it back to
        // whatever timestamp happens to be embedded in the pasted URL.
        // Content changed, so an earlier admin verification no longer
        // vouches for what's actually there — require re-review.
        isVerified: false,
        cast: { create: personIds.map((personId, order) => ({ personId, order })) },
        tags: { set: tagIds.map((id) => ({ id })) },
        styles: { set: styleIds.map((id) => ({ id })) },
        moves: { set: moveIds.map((id) => ({ id })) },
      },
      include: {
        submittedBy: { select: { username: true, image: true } },
        cast: { orderBy: { order: "asc" }, include: { person: true } },
        tags: true,
        styles: true,
        moves: true,
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
