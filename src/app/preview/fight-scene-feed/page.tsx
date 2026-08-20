import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getFightSceneRatingSummaries, getFightSceneAdminRatingSummaries } from "@/lib/fight-scenes";
import { FightSceneFeedPreview } from "@/components/fight-scene-feed-preview";

// Throwaway route for the "swipeable fight scenes" backlog item — not linked
// from anywhere in the app, just a direct-navigate preview so the swipe/
// autoplay feel can be judged with real clips before deciding whether to
// build the real feature. Delete this route (and the component it renders)
// once the decision is made either way.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

const PREVIEW_SIZE = 15;

export default async function FightSceneFeedPreviewPage() {
  const scenes = await prisma.fightScene.findMany({
    where: { isDeleted: false, isVerified: true },
    orderBy: { createdAt: "desc" },
    take: PREVIEW_SIZE,
    include: {
      movie: { select: { id: true, title: true, releaseDate: true } },
      tags: true,
      cast: { orderBy: { order: "asc" }, include: { person: true } },
    },
  });

  const [memberSummaries, editorSummaries] = await Promise.all([
    getFightSceneRatingSummaries(scenes.map((s) => s.id)),
    getFightSceneAdminRatingSummaries(scenes.map((s) => s.id)),
  ]);

  const feedScenes = scenes.map((scene) => ({
    id: scene.id,
    title: scene.title,
    youtubeVideoId: scene.youtubeVideoId,
    youtubeStartSeconds: scene.youtubeStartSeconds,
    movie: scene.movie,
    cast: scene.cast.map((c) => ({ id: c.person.id, name: c.person.name })),
    tags: scene.tags.map((t) => ({ id: t.id, name: t.name })),
    memberRatingAverage: memberSummaries.get(scene.id)?.average ?? null,
    memberRatingCount: memberSummaries.get(scene.id)?.count ?? 0,
    editorRatingAverage: editorSummaries.get(scene.id)?.average ?? null,
    editorRatingCount: editorSummaries.get(scene.id)?.count ?? 0,
  }));

  return <FightSceneFeedPreview scenes={feedScenes} />;
}
