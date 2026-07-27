import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in to rate movies." }, { status: 401 });
  }

  const { id: movieId } = await params;
  const { score } = await request.json();

  if (typeof score !== "number" || !Number.isInteger(score) || score < 1 || score > 10) {
    return NextResponse.json({ error: "score must be an integer between 1 and 10." }, { status: 400 });
  }

  const rating = await prisma.rating.upsert({
    where: { userId_movieId: { userId: session.user.id, movieId } },
    update: { score },
    create: { userId: session.user.id, movieId, score },
  });

  return NextResponse.json({ rating });
}
