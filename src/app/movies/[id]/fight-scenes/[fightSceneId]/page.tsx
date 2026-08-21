import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { youtubeThumbnailUrl } from "@/lib/youtube";
import {
  getFightSceneById,
  getFightScenesForMovie,
  getFightSceneRatingSummaries,
  getFightSceneAdminRatingSummaries,
  getFightSceneTags,
  getFightSceneRoundNumbers,
} from "@/lib/fight-scenes";
import { FightSceneSection } from "@/components/fight-scene-section";
import { YoutubeThumbnailImage } from "@/components/fight-scene-thumbnail";

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

  const [movieCast, tagOptions, ratingSummaries, adminRatingSummaries, myRating, myAdminRating, roundNumbers, myMemberLists, myFightSceneFavorites, movieScenes] =
    await Promise.all([
      prisma.castCredit.findMany({ where: { movieId }, include: { person: true }, orderBy: { order: "asc" } }),
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
      getFightScenesForMovie(movieId),
    ]);

  const summary = ratingSummaries.get(scene.id);
  const adminSummary = adminRatingSummaries.get(scene.id);

  // movieScenes is ordered the same way round numbers are assigned (creation
  // order), so adjacent array entries are adjacent rounds — no separate
  // lookup needed for "previous"/"next".
  const sceneIndex = movieScenes.findIndex((s) => s.id === scene.id);
  const prevScene = sceneIndex > 0 ? movieScenes[sceneIndex - 1] : null;
  const nextScene = sceneIndex >= 0 && sceneIndex < movieScenes.length - 1 ? movieScenes[sceneIndex + 1] : null;
  const otherScenes = movieScenes.filter((s) => s.id !== scene.id);
  const otherSceneRatings = await getFightSceneRatingSummaries(otherScenes.map((s) => s.id));
  const sceneCastPersonIds = new Set(scene.cast.map((c) => c.person.id));

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
      <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-neutral-400">
        <Link href={`/movies/${movieId}`} className="hover:text-white">
          {scene.movie.title}
        </Link>
        <BreadcrumbChevron />
        <Link href={`/movies/${movieId}#fight-scenes`} className="hover:text-white">
          Fights
        </Link>
        <BreadcrumbChevron />
        <span className="font-medium text-neutral-100">{scene.title}</span>
      </nav>

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
        detail
        totalRounds={movieScenes.length}
        prevScenePath={prevScene ? `/movies/${movieId}/fight-scenes/${prevScene.id}` : null}
        nextScenePath={nextScene ? `/movies/${movieId}/fight-scenes/${nextScene.id}` : null}
      />

      {/* Demoted "exit" zone — clearly a step down from the scene above, not competing
          with it: small muted labels instead of headings, single-row scroll instead of
          a wrapping grid, no room-filling cards. */}
      <div className="mt-7 border-t border-neutral-800 pt-5">
        {movieCast.length > 0 && (
          <>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <p className="font-mono text-[11px] tracking-wide text-neutral-500 uppercase">Cast in this movie</p>
              <span className="h-1.5 w-1.5 shrink-0 rounded-full border border-red-600 bg-red-950" />
              <p className="font-mono text-[10px] text-neutral-600">= also in this scene</p>
            </div>
            <div className="rail-scrollbar mb-6 flex gap-1.5 overflow-x-auto pb-1">
              {movieCast.map((credit) => {
                const inScene = sceneCastPersonIds.has(credit.person.id);
                return (
                  <Link
                    key={credit.id}
                    href={`/actors/${credit.person.id}`}
                    className={
                      inScene
                        ? "shrink-0 rounded-full border border-red-600 bg-red-950/40 px-2.5 py-1 font-mono text-[11px] text-red-300"
                        : "shrink-0 rounded-full border border-neutral-700 px-2.5 py-1 font-mono text-[11px] text-neutral-300 hover:border-neutral-500 hover:text-white"
                    }
                  >
                    {credit.person.name}
                  </Link>
                );
              })}
            </div>
          </>
        )}

        {otherScenes.length > 0 && (
          <>
            <p className="mb-2 font-mono text-[11px] tracking-wide text-neutral-500 uppercase">More fights from this movie</p>
            <div className="rail-scrollbar flex gap-2 overflow-x-auto pb-1">
              {otherScenes.map((other) => {
                const otherRating = otherSceneRatings.get(other.id);
                return (
                  <Link
                    key={other.id}
                    href={`/movies/${movieId}/fight-scenes/${other.id}`}
                    className="flex w-[180px] shrink-0 items-center gap-2.5 rounded-md border border-neutral-800 p-1.5 text-neutral-300 hover:border-neutral-600"
                  >
                    <div className="relative h-9 w-16 shrink-0 overflow-hidden rounded-sm bg-neutral-950">
                      <YoutubeThumbnailImage videoId={other.youtubeVideoId} title={other.title} textClassName="text-[6px]" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-mono text-[9px] tracking-wide text-neutral-500 uppercase">
                        Round {roundNumbers.get(other.id) ?? "?"}
                      </p>
                      <p className="truncate font-mono text-xs text-neutral-300">{other.title}</p>
                      {otherRating?.count ? (
                        <p className="font-mono text-[10px]" style={{ color: "#a4291e" }}>
                          {otherRating.average?.toFixed(1)} <span className="text-neutral-600">({otherRating.count})</span>
                        </p>
                      ) : null}
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>
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
