import { NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { requireAdminSession } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";
import { sniffImageType } from "@/lib/image-type";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: movieId } = await params;
  const movie = await prisma.movie.findUnique({ where: { id: movieId } });
  if (!movie) {
    return NextResponse.json({ error: "Movie not found." }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required." }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Poster must be 5MB or smaller." }, { status: 400 });
  }

  // Sniffed from the actual bytes, not file.type — a client fully controls
  // the declared Content-Type/File.type independent of what it actually
  // uploads, so trusting it would let a non-image file get stored (and
  // served back) with a spoofed image content type.
  const bytes = await file.arrayBuffer();
  const sniffedType = sniffImageType(new Uint8Array(bytes));
  if (!sniffedType) {
    return NextResponse.json({ error: "Poster must be a JPEG, PNG, or WebP image." }, { status: 400 });
  }

  let blob;
  try {
    blob = await put(`movie-posters/${movieId}-${Date.now()}`, bytes, {
      access: "public",
      contentType: sniffedType,
    });
  } catch (error) {
    console.error("Poster upload to Vercel Blob failed:", error);
    return NextResponse.json({ error: "Failed to upload poster. Please try again." }, { status: 500 });
  }

  // Best-effort cleanup of the previous override so replacing a poster
  // doesn't silently accumulate orphaned blobs — not worth failing the
  // request over if it errors.
  if (movie.posterOverrideUrl) {
    await del(movie.posterOverrideUrl).catch(() => {});
  }

  const updated = await prisma.movie.update({
    where: { id: movieId },
    data: { posterOverrideUrl: blob.url },
  });

  return NextResponse.json({ posterOverrideUrl: updated.posterOverrideUrl });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: movieId } = await params;
  const movie = await prisma.movie.findUnique({ where: { id: movieId } });
  if (!movie) {
    return NextResponse.json({ error: "Movie not found." }, { status: 404 });
  }

  if (movie.posterOverrideUrl) {
    await del(movie.posterOverrideUrl).catch(() => {});
  }

  await prisma.movie.update({ where: { id: movieId }, data: { posterOverrideUrl: null } });
  return NextResponse.json({ ok: true });
}
