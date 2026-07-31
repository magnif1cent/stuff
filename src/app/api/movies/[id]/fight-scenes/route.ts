import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isEmailVerified } from "@/lib/verification";
import { parseYoutubeUrl } from "@/lib/youtube";
import { MAX_FIGHT_SCENE_CAST } from "@/lib/fight-scenes";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in to add a fight scene." }, { status: 401 });
  }
  if (!(await isEmailVerified(session.user.id))) {
    return NextResponse.json({ error: "Verify your email before adding a fight scene." }, { status: 403 });
  }

  const { id: movieId } = await params;
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

  // Actors must already be part of this movie's cast, so members can't tag
  // someone who was never in the film.
  const castCount = await prisma.castCredit.count({
    where: { movieId, personId: { in: uniquePersonIds } },
  });
  if (castCount !== uniquePersonIds.length) {
    return NextResponse.json(
      { error: "All actors must be part of this movie's cast." },
      { status: 400 },
    );
  }

  const fightScene = await prisma.fightScene.create({
    data: {
      movieId,
      submittedById: session.user.id,
      youtubeVideoId: parsed.videoId,
      youtubeStartSeconds: parsed.startSeconds,
      cast: {
        create: uniquePersonIds.map((personId, order) => ({ personId, order })),
      },
    },
    include: {
      submittedBy: { select: { name: true, image: true } },
      cast: { orderBy: { order: "asc" }, include: { person: true } },
    },
  });

  return NextResponse.json({ fightScene });
}
