import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isEmailVerified } from "@/lib/verification";

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

  const { movieId } = await request.json();
  if (typeof movieId !== "string") {
    return NextResponse.json({ error: "movieId is required." }, { status: 400 });
  }
  const movie = await prisma.movie.findUnique({ where: { id: movieId } });
  if (!movie) {
    return NextResponse.json({ error: "Movie not found." }, { status: 404 });
  }

  const entry = await prisma.memberListEntry.upsert({
    where: { listId_movieId: { listId, movieId } },
    update: {},
    create: { listId, movieId },
  });
  return NextResponse.json({ entry });
}
