import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isEmailVerified } from "@/lib/verification";
import { MAX_MEMBER_LISTS, MEMBER_LIST_NAME_MAX_LENGTH } from "@/lib/member-lists";
import { checkRateLimit, listCreateLimiter } from "@/lib/rate-limit";

// Finds the first unused "{name} (copy)", "{name} (copy 2)", ... for this
// member — same @@unique([userId, name]) constraint a manually-created list
// with a clashing name would hit, so cloning has to route around it instead
// of failing outright the way plain creation does.
async function uniqueCloneName(userId: string, sourceName: string): Promise<string> {
  for (let attempt = 1; attempt <= MAX_MEMBER_LISTS; attempt++) {
    const suffix = attempt === 1 ? " (copy)" : ` (copy ${attempt})`;
    const base = sourceName.slice(0, MEMBER_LIST_NAME_MAX_LENGTH - suffix.length);
    const candidate = `${base}${suffix}`;
    const existing = await prisma.memberList.findUnique({
      where: { userId_name: { userId, name: candidate } },
    });
    if (!existing) return candidate;
  }
  // Unreachable in practice: a member can own at most MAX_MEMBER_LISTS lists
  // total, so at most that many "(copy N)" variants of one name could exist.
  throw new Error("Could not find an available list name.");
}

export async function POST(request: Request, { params }: { params: Promise<{ listId: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in to clone a list." }, { status: 401 });
  }
  if (!(await isEmailVerified(session.user.id))) {
    return NextResponse.json({ error: "Verify your email before cloning a list." }, { status: 403 });
  }

  const rateLimit = await checkRateLimit(listCreateLimiter, session.user.id);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "You're creating lists too quickly. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  const { listId } = await params;
  const source = await prisma.memberList.findUnique({
    where: { id: listId },
    include: {
      // Same visibility rules as the list's own page: a pending movie is
      // only visible to its submitter, and a soft-deleted fight scene
      // shouldn't linger just because it was saved before deletion — a
      // clone should only ever contain what the cloning member could
      // actually see on the source list's page.
      entries: { where: { movie: { status: "APPROVED" } } },
      fightSceneEntries: { where: { fightScene: { isDeleted: false } } },
    },
  });
  if (!source) {
    return NextResponse.json({ error: "List not found." }, { status: 404 });
  }
  if (source.userId === session.user.id) {
    return NextResponse.json({ error: "You already own this list." }, { status: 403 });
  }

  const listCount = await prisma.memberList.count({ where: { userId: session.user.id } });
  if (listCount >= MAX_MEMBER_LISTS) {
    return NextResponse.json({ error: `You can have at most ${MAX_MEMBER_LISTS} lists.` }, { status: 400 });
  }

  const name = await uniqueCloneName(session.user.id, source.name);

  // Structure (which items, their order, ranked or not) carries over;
  // per-item notes and the list description don't — those are the original
  // owner's own commentary, and copying them silently into the clone would
  // read as the new owner's words with no indication they aren't.
  const list = await prisma.memberList.create({
    data: {
      userId: session.user.id,
      name,
      isRanked: source.isRanked,
      entries: {
        create: source.entries.map((entry) => ({ movieId: entry.movieId, rank: entry.rank })),
      },
      fightSceneEntries: {
        create: source.fightSceneEntries.map((entry) => ({ fightSceneId: entry.fightSceneId, rank: entry.rank })),
      },
    },
  });

  return NextResponse.json({ list });
}
