import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ listId: string; movieId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { listId, movieId } = await params;
  const list = await prisma.memberList.findUnique({ where: { id: listId } });
  if (!list) {
    return NextResponse.json({ error: "List not found." }, { status: 404 });
  }
  if (list.userId !== session.user.id) {
    return NextResponse.json({ error: "You can only edit your own lists." }, { status: 403 });
  }

  await prisma.memberListEntry.deleteMany({ where: { listId, movieId } });
  return NextResponse.json({ ok: true });
}
