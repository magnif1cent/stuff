import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const RESULT_LIMIT = 6;

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (!query) {
    return NextResponse.json({ results: [] });
  }

  const [titleMatches, castMatches, directorMatches] = await Promise.all([
    prisma.movie.findMany({
      where: { title: { contains: query, mode: "insensitive" }, status: "APPROVED" },
      orderBy: { tmdbPopularity: "desc" },
      take: RESULT_LIMIT,
      select: { id: true, title: true, releaseDate: true, posterPath: true },
    }),
    prisma.movie.findMany({
      where: {
        cast: { some: { person: { name: { contains: query, mode: "insensitive" } } } },
        status: "APPROVED",
      },
      orderBy: { tmdbPopularity: "desc" },
      take: RESULT_LIMIT,
      select: { id: true, title: true, releaseDate: true, posterPath: true },
    }),
    prisma.movie.findMany({
      where: { director: { contains: query, mode: "insensitive" }, status: "APPROVED" },
      orderBy: { tmdbPopularity: "desc" },
      take: RESULT_LIMIT,
      select: { id: true, title: true, releaseDate: true, posterPath: true },
    }),
  ]);

  const byId = new Map(titleMatches.map((m) => [m.id, m]));
  for (const movie of [...castMatches, ...directorMatches]) {
    if (!byId.has(movie.id)) byId.set(movie.id, movie);
  }

  return NextResponse.json({ results: [...byId.values()].slice(0, RESULT_LIMIT) });
}
