import { NextResponse } from "next/server";
import { requireReviewerSession } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";

// Deliberately separate from the general DELETE /api/admin/movies/[id] (ADMIN
// only, deletes any catalog movie). REVIEWER can reject a submission, but
// that permission must not extend to deleting an already-approved movie —
// scoping this endpoint to PENDING rows only is what keeps those two powers
// apart, rather than branching on status inside the shared delete route.
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
  if (existing.status !== "PENDING") {
    return NextResponse.json({ error: "Only pending submissions can be rejected." }, { status: 400 });
  }

  await prisma.movie.delete({ where: { id: movieId } });
  return NextResponse.json({ ok: true });
}
