import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isEmailVerified } from "@/lib/verification";
import { parseAndValidateFightSceneInput } from "@/lib/fight-scenes";
import { checkRateLimit, fightSceneSubmitLimiter } from "@/lib/rate-limit";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in to add a fight scene." }, { status: 401 });
  }
  if (!(await isEmailVerified(session.user.id))) {
    return NextResponse.json({ error: "Verify your email before adding a fight scene." }, { status: 403 });
  }

  const rateLimit = await checkRateLimit(fightSceneSubmitLimiter, session.user.id);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "You're submitting too quickly. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  const { id: movieId } = await params;
  const body = await request.json();
  const result = await parseAndValidateFightSceneInput(movieId, body);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  const { title, videoId, startSeconds, personIds, tagIds, styleIds, moveIds } = result;

  const fightScene = await prisma.fightScene.create({
    data: {
      movieId,
      submittedById: session.user.id,
      title,
      youtubeVideoId: videoId,
      youtubeStartSeconds: startSeconds,
      cast: { create: personIds.map((personId, order) => ({ personId, order })) },
      tags: { connect: tagIds.map((id) => ({ id })) },
      styles: { connect: styleIds.map((id) => ({ id })) },
      moves: { connect: moveIds.map((id) => ({ id })) },
    },
    include: {
      submittedBy: { select: { username: true, image: true } },
      cast: { orderBy: { order: "asc" }, include: { person: true } },
      tags: true,
      styles: true,
      moves: true,
    },
  });

  return NextResponse.json({ fightScene });
}
