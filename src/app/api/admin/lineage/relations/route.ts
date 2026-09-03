import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";
import { createLineageRelation, figureSelect, toFigureRef } from "@/lib/lineage";

export async function GET() {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const relations = await prisma.lineageRelation.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      sifu: { select: figureSelect },
      student: { select: figureSelect },
    },
  });
  return NextResponse.json({
    relations: relations.map((r) => ({
      id: r.id,
      isPrimary: r.isPrimary,
      note: r.note,
      sifu: toFigureRef(r.sifu),
      student: toFigureRef(r.student),
    })),
  });
}

// sifuId/studentId here are LineageFigure ids -- resolving an actor pick or
// a bare-figure name into a figure id happens client-side first, via
// POST /api/admin/lineage/figures/resolve-person or
// POST /api/admin/lineage/figures.
export async function POST(request: Request) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { sifuId, studentId, note, makePrimary } = body ?? {};
  if (typeof sifuId !== "string" || typeof studentId !== "string") {
    return NextResponse.json({ error: "sifuId and studentId are required." }, { status: 400 });
  }
  if (note !== undefined && note !== null && typeof note !== "string") {
    return NextResponse.json({ error: "note must be a string." }, { status: 400 });
  }

  const result = await createLineageRelation({
    sifuId,
    studentId,
    note,
    makePrimary: makePrimary === true,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const [sifuRow, studentRow] = await Promise.all([
    prisma.lineageFigure.findUnique({ where: { id: sifuId }, select: figureSelect }),
    prisma.lineageFigure.findUnique({ where: { id: studentId }, select: figureSelect }),
  ]);

  return NextResponse.json({
    relation: {
      ...result.relation,
      sifu: sifuRow && toFigureRef(sifuRow),
      student: studentRow && toFigureRef(studentRow),
    },
  });
}
