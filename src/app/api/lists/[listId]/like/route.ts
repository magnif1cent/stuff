import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isEmailVerified } from "@/lib/verification";
import { createNotification } from "@/lib/notifications";

export async function POST(request: Request, { params }: { params: Promise<{ listId: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in to like a list." }, { status: 401 });
  }
  if (!(await isEmailVerified(session.user.id))) {
    return NextResponse.json({ error: "Verify your email before liking a list." }, { status: 403 });
  }

  const { listId } = await params;
  const list = await prisma.memberList.findUnique({ where: { id: listId } });
  if (!list) {
    return NextResponse.json({ error: "List not found." }, { status: 404 });
  }
  if (list.userId === session.user.id) {
    return NextResponse.json({ error: "You can't like your own list." }, { status: 403 });
  }

  const existing = await prisma.memberListLike.findUnique({
    where: { userId_listId: { userId: session.user.id, listId } },
  });

  if (existing) {
    await prisma.memberListLike.delete({ where: { id: existing.id } });
  } else {
    await prisma.memberListLike.create({ data: { userId: session.user.id, listId } });
    await createNotification({
      recipientId: list.userId,
      type: "LIST_LIKE",
      message: `${session.user.username} liked your list "${list.name}"`,
      link: `/lists/${listId}`,
    });
  }

  const likeCount = await prisma.memberListLike.count({ where: { listId } });
  return NextResponse.json({ active: !existing, likeCount });
}
