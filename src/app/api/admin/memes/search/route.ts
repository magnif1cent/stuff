import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";

// Same title/movie-title ILIKE OR as /search/fights, scoped down to a small
// picker result set rather than a full paginated search page.
export async function GET(request: Request) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (!query) {
    return NextResponse.json({ scenes: [] });
  }

  const scenes = await prisma.fightScene.findMany({
    where: {
      isDeleted: false,
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { movie: { title: { contains: query, mode: "insensitive" } } },
      ],
    },
    select: {
      id: true,
      title: true,
      youtubeVideoId: true,
      movie: { select: { title: true } },
    },
    take: 8,
    orderBy: { title: "asc" },
  });

  return NextResponse.json({ scenes });
}
