import { prisma } from "@/lib/prisma";
import { getFunFactsForPerson, getPersonFunFactVoteSummaries } from "@/lib/person-fun-facts";
import { getPersonSignatureVoteSummary } from "@/lib/person-signature-votes";

// One short line under the actor's name on the homepage card -- written by
// the admin when picking the actor, instead of a live TMDB biography fetch
// on every homepage load (TMDB responses aren't cached here).
export const MAX_SPOTLIGHT_BLURB_LENGTH = 160;

// Only scenes that are publicly visible anywhere else can be featured.
const VISIBLE_SCENE = { isDeleted: false, movie: { status: "APPROVED" as const } };

export async function getCurrentSpotlight() {
  return prisma.actorSpotlight.findFirst({
    where: { endedAt: null },
    orderBy: { createdAt: "desc" },
    select: { id: true, personId: true, blurb: true },
  });
}

// The best-voted fun fact (up minus down), newest first on a tie.
async function getTopFunFact(personId: string): Promise<string | null> {
  const facts = await getFunFactsForPerson(personId);
  if (facts.length === 0) return null;
  const votes = await getPersonFunFactVoteSummaries(facts.map((f) => f.id));
  const score = (id: string) => {
    const v = votes.get(id);
    return v ? v.up - v.down : 0;
  };
  // getFunFactsForPerson is already newest-first, and sort is stable.
  return [...facts].sort((a, b) => score(b.id) - score(a.id))[0].content;
}

// The members' signature-fight pick if there is one, otherwise the actor's
// most recently tagged fight -- labeled differently on the card.
async function getFeaturedFight(personId: string) {
  const { fightSceneVotes } = await getPersonSignatureVoteSummary(personId);
  const votedIds = [...fightSceneVotes.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);

  const select = {
    id: true,
    movieId: true,
    title: true,
    youtubeVideoId: true,
    movie: { select: { title: true, releaseDate: true } },
  };

  if (votedIds.length > 0) {
    const scenes = await prisma.fightScene.findMany({ where: { id: { in: votedIds }, ...VISIBLE_SCENE }, select });
    const byId = new Map(scenes.map((s) => [s.id, s]));
    const top = votedIds.map((id) => byId.get(id)).find((s) => s !== undefined);
    if (top) return { scene: top, isSignature: true };
  }

  const latest = await prisma.fightScene.findFirst({
    where: { cast: { some: { personId } }, ...VISIBLE_SCENE },
    orderBy: { createdAt: "desc" },
    select,
  });
  return latest ? { scene: latest, isSignature: false } : null;
}

// The actor's primary sifu, if their lineage has one. Caught like the actor
// page's own lineage lookup: lineage is supplementary, so a failure hides
// the line rather than taking down the homepage.
async function getLineage(personId: string) {
  const figure = await prisma.lineageFigure.findUnique({
    where: { personId },
    select: {
      studentLinks: {
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        take: 1,
        select: { sifu: { select: { id: true, name: true, personId: true } } },
      },
      _count: { select: { sifuLinks: true, studentLinks: true } },
    },
  });
  if (!figure) return null;
  return {
    sifu: figure.studentLinks[0]?.sifu ?? null,
    hasTree: figure._count.sifuLinks + figure._count.studentLinks > 0,
  };
}

export async function getActorSpotlight() {
  const spotlight = await prisma.actorSpotlight.findFirst({
    where: { endedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      blurb: true,
      person: { select: { id: true, name: true, nativeName: true, profilePath: true } },
    },
  });
  if (!spotlight) return null;

  const personId = spotlight.person.id;
  const [films, fightCount, funFact, fight, lineage] = await Promise.all([
    prisma.castCredit.count({ where: { personId, movie: { status: "APPROVED" } } }),
    prisma.fightSceneCast.count({ where: { personId, fightScene: VISIBLE_SCENE } }),
    getTopFunFact(personId),
    getFeaturedFight(personId),
    getLineage(personId).catch(() => null),
  ]);

  return { ...spotlight, films, fightCount, funFact, fight, lineage };
}

export type ActorSpotlightData = NonNullable<Awaited<ReturnType<typeof getActorSpotlight>>>;
