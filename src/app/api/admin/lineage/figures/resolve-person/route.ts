import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/require-admin";
import { resolveFigureForPerson } from "@/lib/lineage";

// Lazily finds-or-creates the LineageFigure for an actor. Called the moment
// an admin actually picks that actor from search -- not up front for the
// whole catalog, and not just for browsing (see getFigureIdForPerson for
// the read-only equivalent used when merely displaying a page).
export async function POST(request: Request) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { personId } = await request.json();
  if (typeof personId !== "string") {
    return NextResponse.json({ error: "personId is required." }, { status: 400 });
  }

  const figure = await resolveFigureForPerson(personId);
  if (!figure) {
    return NextResponse.json({ error: "Actor not found." }, { status: 404 });
  }
  return NextResponse.json({ figure });
}
