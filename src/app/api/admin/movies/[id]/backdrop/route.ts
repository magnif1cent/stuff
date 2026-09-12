import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";
import { tmdbImageUrl } from "@/lib/tmdb";

// Sets the override to a backdrop picked from the TMDB gallery -- unlike
// posterOverrideUrl, there's no upload path here, so this is always a TMDB
// image URL, never a Blob one. Nothing for a DELETE to clean up in our own
// storage either, for the same reason.
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: movieId } = await params;
  const movie = await prisma.movie.findUnique({ where: { id: movieId } });
  if (!movie) {
    return NextResponse.json({ error: "Movie not found." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const backdropPath = body?.backdropPath;
  if (typeof backdropPath !== "string" || !backdropPath.startsWith("/")) {
    return NextResponse.json({ error: "backdropPath must be a TMDB image path." }, { status: 400 });
  }

  const backdropUrl = tmdbImageUrl(backdropPath, "original");
  if (!backdropUrl) {
    return NextResponse.json({ error: "Invalid backdropPath." }, { status: 400 });
  }

  const updated = await prisma.movie.update({
    where: { id: movieId },
    data: { backdropOverrideUrl: backdropUrl },
  });

  return NextResponse.json({ backdropOverrideUrl: updated.backdropOverrideUrl });
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

  await prisma.movie.update({ where: { id: movieId }, data: { backdropOverrideUrl: null } });
  return NextResponse.json({ ok: true });
}
