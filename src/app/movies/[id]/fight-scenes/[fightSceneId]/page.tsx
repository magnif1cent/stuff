import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { youtubeThumbnailUrl } from "@/lib/youtube";
import {
  getFightSceneById,
  getFightSceneRatingSummaries,
  getFightSceneAdminRatingSummaries,
  getFightSceneTags,
  getFightSceneRoundNumbers,
} from "@/lib/fight-scenes";
import { FightSceneSection } from "@/components/fight-scene-section";

type Params = { id: string; fightSceneId: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { id: movieId, fightSceneId } = await params;
  const scene = await getFightSceneById(movieId, fightSceneId);
  if (!scene) return {};

  const summary = await getFightSceneRatingSummaries([scene.id]);
  const rating = summary.get(scene.id);
  const description = rating?.count
    ? `${rating.average?.toFixed(1)}/10 from ${rating.count} member${rating.count === 1 ? "" : "s"} · watch the scene from ${scene.movie.title}`
    : `Watch the scene from ${scene.movie.title}`;

  return {
    title: `${scene.title} — ${scene.movie.title}`,
    description,
    openGraph: {
      title: `${scene.title} — ${scene.movie.title}`,
      description,
      images: [youtubeThumbnailUrl(scene.youtubeVideoId)],
    },
  };
}

export default async function FightScenePage({ params }: { params: Promise<Params> }) {
  const { id: movieId, fightSceneId } = await params;
  const session = await auth();

  const scene = await getFightSceneById(movieId, fightSceneId);
  if (!scene) {
    notFound();
  }

  const [movieCast, tagOptions, ratingSummaries, adminRatingSummaries, myRating, myAdminRating, roundNumbers, myMemberLists, myFightSceneFavorites] =
    await Promise.all([
      prisma.castCredit.findMany({ where: { movieId }, include: { person: true } }),
      getFightSceneTags(),
      getFightSceneRatingSummaries([scene.id]),
      getFightSceneAdminRatingSummaries([scene.id]),
      session?.user
        ? prisma.fightSceneRating.findUnique({
            where: { userId_fightSceneId: { userId: session.user.id, fightSceneId: scene.id } },
          })
        : null,
      session?.user?.role === "ADMIN"
        ? prisma.fightSceneAdminRating.findUnique({
            where: { adminId_fightSceneId: { adminId: session.user.id, fightSceneId: scene.id } },
          })
        : null,
      getFightSceneRoundNumbers(movieId),
      session?.user
        ? prisma.memberList.findMany({
            where: { userId: session.user.id },
            orderBy: { createdAt: "asc" },
            include: { fightSceneEntries: { where: { fightSceneId: scene.id }, select: { id: true } } },
          })
        : [],
      session?.user
        ? prisma.fightSceneFavorite.findMany({ where: { userId: session.user.id, fightSceneId: scene.id } })
        : [],
    ]);

  const summary = ratingSummaries.get(scene.id);
  const adminSummary = adminRatingSummaries.get(scene.id);

  const serializedScene = {
    id: scene.id,
    roundNumber: roundNumbers.get(scene.id) ?? 0,
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

  const castOptions = movieCast.map((credit) => ({ id: credit.person.id, name: credit.person.name }));
  const myMemberListItems = myMemberLists.map((list) => ({ id: list.id, name: list.name }));
  const mySavedListIdsByScene = {
    [scene.id]: myMemberLists.filter((list) => list.fightSceneEntries.length > 0).map((list) => list.id),
  };
  const myFavoriteSceneIds = myFightSceneFavorites.map((e) => e.fightSceneId);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <Link href={`/movies/${movieId}`} className="inline-flex items-center gap-1 text-sm text-neutral-400 hover:text-white">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        {scene.movie.title}
      </Link>

      <FightSceneSection
        movieId={movieId}
        initialFightScenes={[serializedScene]}
        castOptions={castOptions}
        tagOptions={tagOptions}
        signedIn={!!session?.user}
        currentUserId={session?.user?.id ?? null}
        isAdmin={session?.user?.role === "ADMIN"}
        canVerify={session?.user?.role === "ADMIN" || session?.user?.role === "REVIEWER"}
        myRatings={myRating ? { [scene.id]: myRating.score } : {}}
        myAdminRatings={myAdminRating ? { [scene.id]: myAdminRating.score } : {}}
        myMemberLists={myMemberListItems}
        mySavedListIdsByScene={mySavedListIdsByScene}
        myFavoriteSceneIds={myFavoriteSceneIds}
        heading={null}
        allowAdd={false}
      />
    </div>
  );
}
