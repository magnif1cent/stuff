import { NextResponse } from "next/server";
import { requireReviewerSession } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await requireReviewerSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Bumping passwordChangedAt without touching passwordHash reuses the
  // exact same JWT-invalidation check a real password change relies on
  // (see auth.ts's jwt callback) to sign out every session on this
  // account, including this one — no separate mechanism needed.
  await prisma.user.update({ where: { id: session.user.id }, data: { passwordChangedAt: new Date() } });

  return NextResponse.json({ ok: true });
}
