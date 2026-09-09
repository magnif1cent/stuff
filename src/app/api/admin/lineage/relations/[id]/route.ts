import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";
import { deleteLineageRelation } from "@/lib/lineage";

// Promotes this link to primary (demoting whichever sifu link was primary
// for the same student). There's no way to demote a link directly -- make
// a different one primary instead, same as picking a new primary always
// implies deposing the old one.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { isPrimary } = await request.json();
  if (isPrimary !== true) {
    return NextResponse.json({ error: "Only isPrimary: true is supported." }, { status: 400 });
  }

  const relation = await prisma.lineageRelation.findUnique({ where: { id } });
  if (!relation) {
    return NextResponse.json({ error: "Link not found." }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.lineageRelation.updateMany({
      where: { studentId: relation.studentId, isPrimary: true },
      data: { isPrimary: false },
    });
    await tx.lineageRelation.update({ where: { id }, data: { isPrimary: true } });
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const result = await deleteLineageRelation(id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
