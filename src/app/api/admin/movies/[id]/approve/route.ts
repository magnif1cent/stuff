import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: movieId } = await params;
  const existing = await prisma.movie.findUnique({ where: { id: movieId } });
  if (!existing) {
    return NextResponse.json({ error: "Movie not found." }, { status: 404 });
  }

  const movie = await prisma.movie.update({ where: { id: movieId }, data: { status: "APPROVED" } });
  return NextResponse.json({ movie });
}
