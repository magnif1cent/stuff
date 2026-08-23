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

  // movieId and fightSceneId are independent picks on the same row -- a
  // member can hold a Signature Role pick and a Signature Fight Scene pick
  // for the same actor at once. This request only ever touches the one
  // slot it named, leaving whatever's in the other slot untouched.
  const targetField: "movieId" | "fightSceneId" = movieId ? "movieId" : "fightSceneId";
  const targetValue: string = movieId ?? fightSceneId;
  const isSameChoice = existing?.[targetField] === targetValue;

  const nextMovieId = targetField === "movieId" ? (isSameChoice ? null : targetValue) : (existing?.movieId ?? null);
  const nextFightSceneId =
    targetField === "fightSceneId" ? (isSameChoice ? null : targetValue) : (existing?.fightSceneId ?? null);

  let myVote: { movieId: string | null; fightSceneId: string | null };
  if (nextMovieId === null && nextFightSceneId === null) {
    // Voting for your current pick again retracts it, same toggle behavior
    // as Fun Fact / Tribute / member review voting. Once both slots are
    // empty the row itself serves no purpose.
    if (existing) await prisma.personSignatureVote.delete({ where: { id: existing.id } });
    myVote = { movieId: null, fightSceneId: null };
  } else if (!existing) {
    await prisma.personSignatureVote.create({
      data: { userId: session.user.id, personId, movieId: nextMovieId, fightSceneId: nextFightSceneId },
    });
    myVote = { movieId: nextMovieId, fightSceneId: nextFightSceneId };
  } else {
    await prisma.personSignatureVote.update({
      where: { id: existing.id },
      data: { movieId: nextMovieId, fightSceneId: nextFightSceneId },
    });
    myVote = { movieId: nextMovieId, fightSceneId: nextFightSceneId };
  }

  // Only the one slot this request targeted can have changed -- the other
  // slot was left alone above, so its tally doesn't need refetching.
  const touchedMovieIds = new Set<string>();
  const touchedFightSceneIds = new Set<string>();
  if (targetField === "movieId") {
    if (existing?.movieId) touchedMovieIds.add(existing.movieId);
    if (!isSameChoice) touchedMovieIds.add(targetValue);
  } else {
    if (existing?.fightSceneId) touchedFightSceneIds.add(existing.fightSceneId);
    if (!isSameChoice) touchedFightSceneIds.add(targetValue);
  }

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
