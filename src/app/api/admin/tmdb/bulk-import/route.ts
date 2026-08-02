import { NextResponse } from "next/server";
import Papa from "papaparse";
import { requireAdminSession } from "@/lib/require-admin";
import { bulkImportFromTmdb, MAX_BULK_IMPORT_ROWS, type BulkImportRowInput } from "@/lib/tmdb-bulk-import";

// Bulk imports run TMDB lookups + per-movie cast upserts sequentially for up
// to MAX_BULK_IMPORT_ROWS rows, which can take a while — opt into the
// longest duration Vercel allows rather than the framework default.
export const maxDuration = 60;

export async function POST(request: Request) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A CSV file is required." }, { status: 400 });
  }

  const text = await file.text();
  const parsed = Papa.parse<BulkImportRowInput>(text, {
    header: true,
    skipEmptyLines: true,
    delimiter: ",",
    transformHeader: (header) => header.trim().toLowerCase(),
  });

  if (parsed.errors.length > 0) {
    return NextResponse.json({ error: `Couldn't parse CSV: ${parsed.errors[0].message}` }, { status: 400 });
  }

  const rows = parsed.data;
  if (rows.length === 0) {
    return NextResponse.json({ error: "The CSV has no rows." }, { status: 400 });
  }
  if (rows.length > MAX_BULK_IMPORT_ROWS) {
    return NextResponse.json(
      { error: `Too many rows (${rows.length}). Split into batches of ${MAX_BULK_IMPORT_ROWS} or fewer.` },
      { status: 400 },
    );
  }
  if (!rows.every((row) => row.tmdb_id?.trim() || row.title?.trim())) {
    return NextResponse.json({ error: 'Every row needs a "title" or "tmdb_id" column filled in.' }, { status: 400 });
  }

  const results = await bulkImportFromTmdb(rows);
  return NextResponse.json({ results });
}
