import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/require-admin";
import { createLineageRelation } from "@/lib/lineage";

const MAX_ROWS = 2000;

interface CommitRow {
  sifuId: string;
  studentId: string;
  note?: string | null;
}

function isCommitRow(row: unknown): row is CommitRow {
  if (!row || typeof row !== "object") return false;
  const r = row as Record<string, unknown>;
  return typeof r.sifuId === "string" && typeof r.studentId === "string";
}

// Re-validates every row server-side (cycle check, duplicate check, both
// people still existing) rather than trusting the client's preview pass --
// the preview and the commit can be minutes apart, and another admin could
// have changed the data in between.
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
    return NextResponse.json({ error: "Each row needs sifuId and studentId." }, { status: 400 });
  }

  let created = 0;
  const errors: { sifuId: string; studentId: string; error: string }[] = [];

  for (const row of rows as CommitRow[]) {
    const result = await createLineageRelation({ sifuId: row.sifuId, studentId: row.studentId, note: row.note });
    if (result.ok) {
      created++;
    } else {
      errors.push({ sifuId: row.sifuId, studentId: row.studentId, error: result.error });
    }
  }

  return NextResponse.json({ created, skipped: errors.length, errors });
}
