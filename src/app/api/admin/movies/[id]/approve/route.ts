import { NextResponse } from "next/server";
import { requireReviewerSession } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireReviewerSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: movieId } = await params;
  const existing = await prisma.movie.findUnique({ where: { id: movieId } });
  if (!existing) {
    return NextResponse.json({ error: "Movie not found." }, { status: 404 });
  }

  const movie = await prisma.movie.update({ where: { id: movieId }, data: { status: "APPROVED" } });

  if (movie.submittedById) {
    await createNotification({
      recipientId: movie.submittedById,
      type: "SUBMISSION_APPROVED",
      message: `Your submission "${movie.title}" was approved!`,
      link: `/movies/${movie.id}`,
    });
  }

  return NextResponse.json({ movie });
}
