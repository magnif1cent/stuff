import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";
import { CLEARED_BACKDROP_FRAMING, parseBackdropFraming } from "@/lib/backdrop-framing";

// Sets the movie page banner's focal point + zoom for whichever backdrop is
// currently showing (override or TMDB default). DELETE resets to the default
// crop.
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: movieId } = await params;
  const movie = await prisma.movie.findUnique({ where: { id: movieId }, select: { id: true } });
  if (!movie) {
    return NextResponse.json({ error: "Movie not found." }, { status: 404 });
  }

  const parsed = parseBackdropFraming(await request.json().catch(() => null));
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  await prisma.movie.update({ where: { id: movieId }, data: parsed.data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: movieId } = await params;
  const movie = await prisma.movie.findUnique({ where: { id: movieId }, select: { id: true } });
  if (!movie) {
    return NextResponse.json({ error: "Movie not found." }, { status: 404 });
  }

  await prisma.movie.update({ where: { id: movieId }, data: CLEARED_BACKDROP_FRAMING });
  return NextResponse.json({ ok: true });
}
