import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: movieId } = await params;
  const existing = await prisma.movie.findUnique({ where: { id: movieId } });
  if (!existing) {
    return NextResponse.json({ error: "Movie not found." }, { status: 404 });
  }

  // Hard-delete: every dependent row (cast credits, ratings, discussion
  // posts, fight scenes and their own cast/ratings, the editorial review,
  // weekly-featured entries) cascades from the schema's onDelete rules, so
  // this one call fully removes the movie and everything attached to it.
  await prisma.movie.delete({ where: { id: movieId } });
  return NextResponse.json({ ok: true });
}
