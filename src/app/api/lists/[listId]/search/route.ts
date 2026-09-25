import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getFightSceneRatingSummaries } from "@/lib/fight-scenes";

const RESULT_LIMIT = 6;
// Fights are shown top-rated first, and ratings live in their own table, so
// this pulls a wider candidate pool to sort in memory before trimming to
// RESULT_LIMIT — a movie title search can match a dozen fights from one film.
const FIGHT_CANDIDATE_LIMIT = 30;

// Backs the owner's "Add to this list" search on /lists/[listId]: movies and
// fight scenes in one request, each flagged with whether it's already in the
// list so the UI can show "In list" instead of an Add button. Scoped to one
// list (rather than reusing /api/search) because of that flag — and
// owner-only, with the same 404 a private list gives anyone else.
export async function GET(request: Request, { params }: { params: Promise<{ listId: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { listId } = await params;
  const list = await prisma.memberList.findUnique({ where: { id: listId }, select: { userId: true } });
  if (!list || list.userId !== session.user.id) {
    return NextResponse.json({ error: "List not found." }, { status: 404 });
  }

  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (!query) {
    return NextResponse.json({ movies: [], fightScenes: [] });
  }

  const contains = { contains: query, mode: "insensitive" as const };

  // Same matching as the navbar search (/api/search): title, then cast,
  // then director, deduped, approved movies only.
  const movieSelect = { id: true, title: true, releaseDate: true, posterPath: true, posterOverrideUrl: true };
  const [titleMatches, castMatches, directorMatches, fightCandidates] = await Promise.all([
    prisma.movie.findMany({
      where: { title: contains, status: "APPROVED" },
      orderBy: { tmdbPopularity: "desc" },
      take: RESULT_LIMIT,
      select: movieSelect,
    }),
    prisma.movie.findMany({
      where: { cast: { some: { person: { name: contains } } }, status: "APPROVED" },
      orderBy: { tmdbPopularity: "desc" },
      take: RESULT_LIMIT,
      select: movieSelect,
    }),
    prisma.movie.findMany({
      where: { director: contains, status: "APPROVED" },
      orderBy: { tmdbPopularity: "desc" },
      take: RESULT_LIMIT,
      select: movieSelect,
    }),
    // A fight matches on its own title or its movie's, so "Drunken Master"
    // finds every fight from that film. Same visibility rule as everywhere
    // else: not soft-deleted, movie approved.
    prisma.fightScene.findMany({
      where: {
        isDeleted: false,
        movie: { status: "APPROVED" },
        OR: [{ title: contains }, { movie: { title: contains } }],
      },
      orderBy: { createdAt: "desc" },
      take: FIGHT_CANDIDATE_LIMIT,
      select: { id: true, title: true, youtubeVideoId: true, movie: { select: { title: true } } },
    }),
  ]);

  const fightRatings = await getFightSceneRatingSummaries(fightCandidates.map((s) => s.id));
  const fightScenes = [...fightCandidates]
    .sort((a, b) => (fightRatings.get(b.id)?.average ?? -1) - (fightRatings.get(a.id)?.average ?? -1))
    .slice(0, RESULT_LIMIT);

  const moviesById = new Map(titleMatches.map((m) => [m.id, m]));
  for (const movie of [...castMatches, ...directorMatches]) {
    if (!moviesById.has(movie.id)) moviesById.set(movie.id, movie);
  }
  const movies = [...moviesById.values()].slice(0, RESULT_LIMIT);

  const [movieEntries, fightSceneEntries] = await Promise.all([
    prisma.memberListEntry.findMany({
      where: { listId, movieId: { in: movies.map((m) => m.id) } },
      select: { movieId: true },
    }),
    prisma.memberListFightSceneEntry.findMany({
      where: { listId, fightSceneId: { in: fightScenes.map((s) => s.id) } },
      select: { fightSceneId: true },
    }),
  ]);
  const moviesInList = new Set(movieEntries.map((e) => e.movieId));
  const scenesInList = new Set(fightSceneEntries.map((e) => e.fightSceneId));

  return NextResponse.json({
    movies: movies.map((m) => ({
      id: m.id,
      title: m.title,
      year: m.releaseDate ? new Date(m.releaseDate).getFullYear() : null,
      posterPath: m.posterPath,
      posterOverrideUrl: m.posterOverrideUrl,
      inList: moviesInList.has(m.id),
    })),
    fightScenes: fightScenes.map((s) => ({
      id: s.id,
      title: s.title,
      movieTitle: s.movie.title,
      youtubeVideoId: s.youtubeVideoId,
      ratingAverage: fightRatings.get(s.id)?.average ?? null,
      inList: scenesInList.has(s.id),
    })),
  });
}
