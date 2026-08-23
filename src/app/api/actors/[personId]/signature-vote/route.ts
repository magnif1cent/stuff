import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isEmailVerified } from "@/lib/verification";

export async function POST(request: Request, { params }: { params: Promise<{ personId: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in to vote." }, { status: 401 });
  }
  if (!(await isEmailVerified(session.user.id))) {
    return NextResponse.json({ error: "Verify your email before voting." }, { status: 403 });
  }

  const { personId } = await params;
  const { movieId, fightSceneId } = await request.json();

  if (!movieId === !fightSceneId) {
    return NextResponse.json({ error: "Vote for exactly one movie or fight scene." }, { status: 400 });
  }

  if (movieId) {
    const credit = await prisma.castCredit.findFirst({
      where: { personId, movieId, movie: { status: "APPROVED" } },
    });
    if (!credit) {
      return NextResponse.json({ error: "That movie isn't in this actor's filmography." }, { status: 404 });
    }
  } else {
    const appearance = await prisma.fightSceneCast.findFirst({
      where: { personId, fightSceneId, fightScene: { isDeleted: false } },
    });
    if (!appearance) {
      return NextResponse.json({ error: "That fight scene isn't tagged with this actor." }, { status: 404 });
    }
  }

  const existing = await prisma.personSignatureVote.findUnique({
    where: { userId_personId: { userId: session.user.id, personId } },
  });

  const isSameChoice =
    !!existing && (movieId ? existing.movieId === movieId : existing.fightSceneId === fightSceneId);

  let myVote: { movieId: string | null; fightSceneId: string | null } | null;
  if (!existing) {
    await prisma.personSignatureVote.create({
      data: { userId: session.user.id, personId, movieId: movieId ?? null, fightSceneId: fightSceneId ?? null },
    });
    myVote = { movieId: movieId ?? null, fightSceneId: fightSceneId ?? null };
  } else if (isSameChoice) {
    // Voting for your current pick again retracts it, same toggle behavior
    // as Fun Fact / Tribute / member review voting.
    await prisma.personSignatureVote.delete({ where: { id: existing.id } });
    myVote = null;
  } else {
    await prisma.personSignatureVote.update({
      where: { id: existing.id },
      data: { movieId: movieId ?? null, fightSceneId: fightSceneId ?? null },
    });
    myVote = { movieId: movieId ?? null, fightSceneId: fightSceneId ?? null };
  }

  // Only the choices that could have changed count need a fresh tally: the
  // previous pick (now down one, if it existed and differs from the new
  // one) and the new pick (now up one, if any).
  const touchedMovieIds = new Set<string>();
  const touchedFightSceneIds = new Set<string>();
  if (existing?.movieId) touchedMovieIds.add(existing.movieId);
  if (existing?.fightSceneId) touchedFightSceneIds.add(existing.fightSceneId);
  if (movieId) touchedMovieIds.add(movieId);
  if (fightSceneId) touchedFightSceneIds.add(fightSceneId);

  const [movieCounts, fightSceneCounts] = await Promise.all([
    Promise.all(
      [...touchedMovieIds].map(async (id) => ({
        id,
        votes: await prisma.personSignatureVote.count({ where: { personId, movieId: id } }),
      })),
    ),
    Promise.all(
      [...touchedFightSceneIds].map(async (id) => ({
        id,
        votes: await prisma.personSignatureVote.count({ where: { personId, fightSceneId: id } }),
      })),
    ),
  ]);

  return NextResponse.json({ myVote, movieCounts, fightSceneCounts });
}
