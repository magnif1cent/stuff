import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Body: { items: [{ kind: "MOVIE" | "FIGHT_SCENE", id: string }, ...] } in
// the caller's desired top-to-bottom order — the whole ranked reel is
// re-submitted on every reorder (drag or up/down move) rather than a single
// moved item, since rank is a shared counter across two tables and
// recomputing every position from one authoritative order is simpler and
// less error-prone than diffing two tables' worth of partial moves.
export async function PATCH(request: Request, { params }: { params: Promise<{ listId: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { listId } = await params;
  const list = await prisma.memberList.findUnique({ where: { id: listId } });
  if (!list) {
    return NextResponse.json({ error: "List not found." }, { status: 404 });
  }
  if (list.userId !== session.user.id) {
    return NextResponse.json({ error: "You can only reorder your own lists." }, { status: 403 });
  }

  const { items } = await request.json();
  if (
    !Array.isArray(items) ||
    items.some(
      (item) =>
        typeof item !== "object" ||
        item === null ||
        (item.kind !== "MOVIE" && item.kind !== "FIGHT_SCENE") ||
        typeof item.id !== "string",
    )
  ) {
    return NextResponse.json(
      { error: "items must be an array of { kind: 'MOVIE' | 'FIGHT_SCENE', id }." },
      { status: 400 },
    );
  }

  await prisma.$transaction(
    items.map((item: { kind: "MOVIE" | "FIGHT_SCENE"; id: string }, index: number) =>
      item.kind === "MOVIE"
        ? prisma.memberListEntry.update({
            where: { listId_movieId: { listId, movieId: item.id } },
            data: { rank: index + 1 },
          })
        : prisma.memberListFightSceneEntry.update({
            where: { listId_fightSceneId: { listId, fightSceneId: item.id } },
            data: { rank: index + 1 },
          }),
    ),
  );

  return NextResponse.json({ ok: true });
}
