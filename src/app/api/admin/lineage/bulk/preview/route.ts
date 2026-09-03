import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/require-admin";
import { previewBulkImport, MAX_CHAIN_TEXT_LENGTH } from "@/lib/lineage";

export async function POST(request: Request) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { text } = await request.json();
  if (typeof text !== "string" || text.trim().length === 0) {
    return NextResponse.json({ error: "Paste at least one chain." }, { status: 400 });
  }
  if (text.length > MAX_CHAIN_TEXT_LENGTH) {
    return NextResponse.json({ error: `Paste must be ${MAX_CHAIN_TEXT_LENGTH} characters or fewer.` }, { status: 400 });
  }

  const rows = await previewBulkImport(text);
  return NextResponse.json({ rows });
}
