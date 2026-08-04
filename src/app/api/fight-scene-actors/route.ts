import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const RESULT_LIMIT = 15;

// Scoped to people who actually appear in a tagged fight scene (not just
// anyone in a movie's cast) — otherwise suggestions here could point at
// an actor with zero fight-scene results once selected.
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (!query) {
    return NextResponse.json({ actors: [] });
  }

  const rows = await prisma.person.findMany({
    where: {
      name: { contains: query, mode: "insensitive" },
      fightSceneAppearances: { some: {} },
    },
    distinct: ["name"],
    orderBy: { name: "asc" },
    select: { name: true },
    take: RESULT_LIMIT,
  });

  return NextResponse.json({ actors: rows.map((r) => r.name) });
}
