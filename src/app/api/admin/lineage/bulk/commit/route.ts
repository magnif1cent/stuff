import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/require-admin";
import { createLineageRelation, resolveFigureForPerson } from "@/lib/lineage";

const MAX_ROWS = 2000;

interface CommitRow {
  sifuPersonId: string;
  studentPersonId: string;
  note?: string | null;
}

function isCommitRow(row: unknown): row is CommitRow {
  if (!row || typeof row !== "object") return false;
  const r = row as Record<string, unknown>;
  return typeof r.sifuPersonId === "string" && typeof r.studentPersonId === "string";
}

// Re-validates every row server-side (cycle check, duplicate check, both
// people still existing) rather than trusting the client's preview pass --
// the preview and the commit can be minutes apart, and another admin could
// have changed the data in between. Bulk import stays actor-only (see
// lib/lineage.ts), so both sides are Person ids here, resolved to their
// LineageFigure (created lazily on first use) right before linking.
export async function POST(request: Request) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { rows } = await request.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "No rows to import." }, { status: 400 });
  }
  if (rows.length > MAX_ROWS) {
    return NextResponse.json({ error: `At most ${MAX_ROWS} rows per import.` }, { status: 400 });
  }
  if (!rows.every(isCommitRow)) {
    return NextResponse.json({ error: "Each row needs sifuPersonId and studentPersonId." }, { status: 400 });
  }

  let created = 0;
  const errors: { sifuPersonId: string; studentPersonId: string; error: string }[] = [];

  for (const row of rows as CommitRow[]) {
    const [sifuFigure, studentFigure] = await Promise.all([
      resolveFigureForPerson(row.sifuPersonId),
      resolveFigureForPerson(row.studentPersonId),
    ]);
    if (!sifuFigure || !studentFigure) {
      errors.push({ ...row, error: "Actor not found." });
      continue;
    }
    const result = await createLineageRelation({ sifuId: sifuFigure.id, studentId: studentFigure.id, note: row.note });
    if (result.ok) {
      created++;
    } else {
      errors.push({ sifuPersonId: row.sifuPersonId, studentPersonId: row.studentPersonId, error: result.error });
    }
  }

  return NextResponse.json({ created, skipped: errors.length, errors });
}
