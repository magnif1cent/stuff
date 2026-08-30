import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";
import { MAX_ADMIN_NOTE_LENGTH } from "@/lib/admin-rating";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: movieId } = await params;
  const { score, note } = await request.json();

  if (typeof score !== "number" || !Number.isInteger(score) || score < 1 || score > 10) {
    return NextResponse.json({ error: "score must be an integer between 1 and 10." }, { status: 400 });
  }

  if (typeof note === "string" && note.length > MAX_ADMIN_NOTE_LENGTH) {
    return NextResponse.json(
      { error: `note must be ${MAX_ADMIN_NOTE_LENGTH} characters or fewer.` },
      { status: 400 },
    );
  }

  const normalizedNote = typeof note === "string" && note.trim() ? note.trim() : null;

  const rating = await prisma.adminRating.upsert({
    where: { adminId_movieId: { adminId: session.user.id, movieId } },
    update: { score, note: normalizedNote },
    create: { adminId: session.user.id, movieId, score, note: normalizedNote },
  });

  return NextResponse.json({ rating });
}
