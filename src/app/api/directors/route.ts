import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const RESULT_LIMIT = 15;

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (!query) {
    return NextResponse.json({ directors: [] });
  }

  const rows = await prisma.movie.findMany({
    where: { director: { contains: query, mode: "insensitive" } },
    distinct: ["director"],
    orderBy: { director: "asc" },
    select: { director: true },
    take: RESULT_LIMIT,
  });

  return NextResponse.json({ directors: rows.map((r) => r.director).filter(Boolean) });
}
