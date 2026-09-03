import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/require-admin";
import { createOrReuseBareFigure } from "@/lib/lineage";

// Creates (or reuses, deduped by exact case-insensitive name) a bare,
// non-actor lineage figure -- a historical sifu never credited in a film, a
// character like Ip Man, or (with isGroup: true) a collective like a stunt
// team. The "not an actor? add by name" fallback in the figure picker calls
// this.
export async function POST(request: Request) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name, isGroup } = await request.json();
  if (typeof name !== "string") {
    return NextResponse.json({ error: "name is required." }, { status: 400 });
  }
  if (isGroup !== undefined && typeof isGroup !== "boolean") {
    return NextResponse.json({ error: "isGroup must be a boolean." }, { status: 400 });
  }

  const result = await createOrReuseBareFigure(name, isGroup === true);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ figure: result.figure });
}
