import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";
import { getMovieRecommenders } from "@/lib/movie-recommendations";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: movieId } = await params;

  await prisma.movieRecommendation.upsert({
    where: { adminId_movieId: { adminId: session.user.id, movieId } },
    update: {},
    create: { adminId: session.user.id, movieId },
  });

  return NextResponse.json({ recommenders: await getMovieRecommenders(movieId) });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: movieId } = await params;

  await prisma.movieRecommendation.deleteMany({
    where: { adminId: session.user.id, movieId },
  });

  return NextResponse.json({ recommenders: await getMovieRecommenders(movieId) });
}
