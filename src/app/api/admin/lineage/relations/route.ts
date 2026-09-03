import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";
import { createLineageRelation } from "@/lib/lineage";

export async function GET() {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const relations = await prisma.lineageRelation.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      sifu: { select: { id: true, name: true, profilePath: true } },
      student: { select: { id: true, name: true, profilePath: true } },
    },
  });
  return NextResponse.json({ relations });
}

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

  const [sifu, student] = await Promise.all([
    prisma.person.findUnique({ where: { id: sifuId }, select: { id: true, name: true, profilePath: true } }),
    prisma.person.findUnique({ where: { id: studentId }, select: { id: true, name: true, profilePath: true } }),
  ]);

  return NextResponse.json({ relation: { ...result.relation, sifu, student } });
}
