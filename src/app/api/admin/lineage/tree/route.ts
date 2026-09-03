import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/require-admin";
import { getLineageTree } from "@/lib/lineage";

export async function GET(request: Request) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const params = new URL(request.url).searchParams;
  const personId = params.get("personId");
  if (!personId) {
    return NextResponse.json({ error: "personId is required." }, { status: 400 });
  }

  const up = params.get("up") ? Number(params.get("up")) : undefined;
  const down = params.get("down") ? Number(params.get("down")) : undefined;
  const tree = await getLineageTree(personId, { up, down });
  if (!tree) {
    return NextResponse.json({ error: "Person not found." }, { status: 404 });
  }
  return NextResponse.json({ tree });
}
