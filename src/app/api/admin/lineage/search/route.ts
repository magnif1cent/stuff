import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";

const RESULT_LIMIT = 8;

// Distinct from /api/actors (which returns bare names for the public search
// bar's autocomplete): this needs real Person records -- id + profilePath --
// since the admin picks a specific actor to link, not just a name string.
export async function GET(request: Request) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (!query) {
    return NextResponse.json({ people: [] });
  }

  const people = await prisma.person.findMany({
    where: { name: { contains: query, mode: "insensitive" } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, profilePath: true },
    take: RESULT_LIMIT,
  });
  return NextResponse.json({ people });
}
