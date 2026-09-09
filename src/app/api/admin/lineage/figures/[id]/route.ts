import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/require-admin";
import { deleteBareFigure, setFigureIsGroup } from "@/lib/lineage";

// Corrects a bare figure's isGroup flag after the fact -- e.g. one added
// without checking the "this is a group" box. Actor-linked figures are
// rejected server-side by setFigureIsGroup.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { isGroup } = await request.json();
  if (typeof isGroup !== "boolean") {
    return NextResponse.json({ error: "isGroup must be a boolean." }, { status: 400 });
  }

  const result = await setFigureIsGroup(id, isGroup);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ figure: result.figure });
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
