import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/require-admin";
import { deleteBareFigure, setFigureAliases, setFigureIsGroup } from "@/lib/lineage";

// Corrects a bare figure's isGroup flag after the fact -- e.g. one added
// without checking the "this is a group" box -- or replaces its alias
// list. Actor-linked figures are rejected server-side by setFigureIsGroup;
// aliases have no such restriction (see setFigureAliases). Takes one field
// at a time rather than a combined partial update -- the two are edited
// from separate controls in the admin tree and never submitted together.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();

  if (typeof body.isGroup === "boolean") {
    const result = await setFigureIsGroup(id, body.isGroup);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ figure: result.figure });
  }

  if (Array.isArray(body.aliases)) {
    if (!body.aliases.every((a: unknown) => typeof a === "string")) {
      return NextResponse.json({ error: "aliases must be an array of strings." }, { status: 400 });
    }
    const result = await setFigureAliases(id, body.aliases);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ figure: result.figure });
  }

  return NextResponse.json({ error: "isGroup or aliases is required." }, { status: 400 });
}

// Deletes a bare (non-actor) figure and, via the schema's onDelete: Cascade,
// every LineageRelation it was part of -- the client is responsible for
// confirming this with the admin first, the same way a single link's
// delete button already does.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const result = await deleteBareFigure(id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
