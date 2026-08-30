import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getFightScenesForMovie,
  getFightSceneRatingSummaries,
  getFightSceneAdminRatingSummaries,
  getFightSceneTags,
  getFightSceneRoundNumbers,
} from "@/lib/fight-scenes";
import { FightSceneSection } from "@/components/fight-scene-section";

// Pending movies are only visible to their submitter and admins/reviewers,
// same rule as the movie detail page itself (isMovieVisible there) --
// duplicated here rather than shared since it's a two-line check against a
// differently-shaped select.
function isMovieVisible(
  movie: { status: string; submittedById: string | null },
  session: Session | null,
) {
  return (
    movie.status === "APPROVED" ||
    session?.user?.role === "ADMIN" ||
    session?.user?.role === "REVIEWER" ||
    session?.user?.id === movie.submittedById
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const movie = await prisma.movie.findUnique({ where: { id }, select: { title: true } });
  return movie ? { title: `Fights — ${movie.title}` } : {};
}

export default async function MovieFightsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: movieId } = await params;
  const session = await auth();

  const movie = await prisma.movie.findUnique({
    where: { id: movieId },
    select: { id: true, title: true, status: true, submittedById: true },
  });
  if (!movie || !isMovieVisible(movie, session)) {
    notFound();
  }

  const [movieCast, fightScenes, tagOptions, myMemberLists, myFightSceneFavorites] = await Promise.all([
    prisma.castCredit.findMany({ where: { movieId }, include: { person: true }, orderBy: { order: "asc" } }),
    getFightScenesForMovie(movieId),
    getFightSceneTags(),
    session?.user
      ? prisma.memberList.findMany({
          where: { userId: session.user.id },
          orderBy: { createdAt: "asc" },
          include: { fightSceneEntries: { select: { fightSceneId: true } } },
        })
      : [],
    session?.user
      ? prisma.fightSceneFavorite.findMany({ where: { userId: session.user.id, fightScene: { movieId } } })
      : [],
  ]);

  const fightSceneIds = fightScenes.map((s) => s.id);
  const [fightSceneRatingSummaries, fightSceneAdminRatingSummaries, myFightSceneRatings, myFightSceneAdminRatings, fightSceneRoundNumbers] =
    await Promise.all([
      getFightSceneRatingSummaries(fightSceneIds),
      getFightSceneAdminRatingSummaries(fightSceneIds),
      session?.user
        ? prisma.fightSceneRating.findMany({ where: { userId: session.user.id, fightSceneId: { in: fightSceneIds } } })
        : [],
      session?.user?.role === "ADMIN"
        ? prisma.fightSceneAdminRating.findMany({ where: { adminId: session.user.id, fightSceneId: { in: fightSceneIds } } })
        : [],
      getFightSceneRoundNumbers(movieId),
    ]);

  const castOptions = movieCast.map((credit) => ({ id: credit.person.id, name: credit.person.name }));
  const myMemberListItems = myMemberLists.map((list) => ({ id: list.id, name: list.name }));
  const myFavoriteFightSceneIds = myFightSceneFavorites.map((e) => e.fightSceneId);

  // Per fight scene, which of the member's lists already contain it -- same
  // shape as the movie page's own mySavedFightSceneListIds.
  const mySavedFightSceneListIds: Record<string, string[]> = {};
  for (const scene of fightScenes) {
    mySavedFightSceneListIds[scene.id] = myMemberLists
      .filter((list) => list.fightSceneEntries.some((e) => e.fightSceneId === scene.id))
      .map((list) => list.id);
  }

  const serializedFightScenes = fightScenes.map((scene) => {
    const summary = fightSceneRatingSummaries.get(scene.id);
    const adminSummary = fightSceneAdminRatingSummaries.get(scene.id);
    return {
      id: scene.id,
      roundNumber: fightSceneRoundNumbers.get(scene.id) ?? 0,
      title: scene.title,
      youtubeVideoId: scene.youtubeVideoId,
      youtubeStartSeconds: scene.youtubeStartSeconds,
      isVerified: scene.isVerified,
      submittedById: scene.submittedById,
      createdAt: scene.createdAt.toISOString(),
      updatedAt: scene.updatedAt.toISOString(),
      submittedBy: scene.submittedBy,
      cast: scene.cast,
      tags: scene.tags,
      ratingAverage: summary?.average ?? null,
      ratingCount: summary?.count ?? 0,
      adminRatingAverage: adminSummary?.average ?? null,
      adminRatingCount: adminSummary?.count ?? 0,
    };
  });

  const myFightSceneRatingMap = Object.fromEntries(myFightSceneRatings.map((r) => [r.fightSceneId, r.score]));
  const myFightSceneAdminRatingMap = Object.fromEntries(
    myFightSceneAdminRatings.map((r) => [r.fightSceneId, r.score]),
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-neutral-400">
        <Link href={`/movies/${movieId}`} className="hover:text-white">
          {movie.title}
        </Link>
        <BreadcrumbChevron />
        <span className="font-medium text-neutral-100">Fights</span>
      </nav>

      <FightSceneSection
        movieId={movieId}
        initialFightScenes={serializedFightScenes}
        castOptions={castOptions}
        tagOptions={tagOptions}
        signedIn={!!session?.user}
        currentUserId={session?.user?.id ?? null}
        isAdmin={session?.user?.role === "ADMIN"}
        canVerify={session?.user?.role === "ADMIN" || session?.user?.role === "REVIEWER"}
        myRatings={myFightSceneRatingMap}
        myAdminRatings={myFightSceneAdminRatingMap}
        myMemberLists={myMemberListItems}
        mySavedListIdsByScene={mySavedFightSceneListIds}
        myFavoriteSceneIds={myFavoriteFightSceneIds}
      />
    </div>
  );
}

function BreadcrumbChevron() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 shrink-0 text-neutral-600">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}
