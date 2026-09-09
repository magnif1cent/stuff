import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/require-admin";
import { searchLineageFigures } from "@/lib/lineage";

// Two separate lists, not one merged/tagged one: an actor result hasn't
// necessarily been turned into a LineageFigure yet (that happens lazily
// once actually picked -- see resolve-person below), so it carries a
// personId, while an existing bare figure result carries a figureId. The
// two id kinds shouldn't be conflated behind one generic "id" field.
export async function GET(request: Request) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (!query) {
    return NextResponse.json({ actors: [], figures: [] });
  }

  const results = await searchLineageFigures(query);
  return NextResponse.json(results);
}
