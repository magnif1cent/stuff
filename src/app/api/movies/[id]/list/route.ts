import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isEmailVerified } from "@/lib/verification";

const VALID_LIST_TYPES = ["FAVORITE", "WATCHLIST"] as const;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in to manage your lists." }, { status: 401 });
  }
  if (!(await isEmailVerified(session.user.id))) {
    return NextResponse.json({ error: "Verify your email before managing lists." }, { status: 403 });
  }

  const { id: movieId } = await params;
  const { listType } = await request.json();

  if (!VALID_LIST_TYPES.includes(listType)) {
    return NextResponse.json({ error: "listType must be FAVORITE or WATCHLIST." }, { status: 400 });
  }

  const existing = await prisma.listEntry.findUnique({
    where: { userId_movieId_listType: { userId: session.user.id, movieId, listType } },
  });

  if (existing) {
    await prisma.listEntry.delete({ where: { id: existing.id } });
    return NextResponse.json({ active: false });
  }

  await prisma.listEntry.create({ data: { userId: session.user.id, movieId, listType } });
  return NextResponse.json({ active: true });
}
