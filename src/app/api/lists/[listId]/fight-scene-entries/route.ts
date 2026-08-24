import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isEmailVerified } from "@/lib/verification";
import { getNextListRank } from "@/lib/member-list-rank";

export async function POST(request: Request, { params }: { params: Promise<{ listId: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  if (!(await isEmailVerified(session.user.id))) {
    return NextResponse.json({ error: "Verify your email before managing lists." }, { status: 403 });
  }

  const { listId } = await params;
  const list = await prisma.memberList.findUnique({ where: { id: listId } });
  if (!list) {
    return NextResponse.json({ error: "List not found." }, { status: 404 });
  }
  if (list.userId !== session.user.id) {
    return NextResponse.json({ error: "You can only add to your own lists." }, { status: 403 });
  }

  const { fightSceneId } = await request.json();
  if (typeof fightSceneId !== "string") {
    return NextResponse.json({ error: "fightSceneId is required." }, { status: 400 });
  }
  const scene = await prisma.fightScene.findUnique({ where: { id: fightSceneId } });
  if (!scene || scene.isDeleted) {
    return NextResponse.json({ error: "Fight scene not found." }, { status: 404 });
  }

  const existingEntry = await prisma.memberListFightSceneEntry.findUnique({
    where: { listId_fightSceneId: { listId, fightSceneId } },
  });
  const entry = existingEntry
    ? existingEntry
    : await prisma.memberListFightSceneEntry.create({
        data: { listId, fightSceneId, rank: await getNextListRank(listId) },
      });
  return NextResponse.json({ entry });
}
