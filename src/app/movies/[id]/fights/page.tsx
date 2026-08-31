import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolvePosterUrl } from "@/lib/tmdb";
import {
  getFightScenesForMovie,
  getFightSceneRatingSummaries,
  getFightSceneAdminRatingSummaries,
  getFightSceneFavoriteCounts,
  getFightSceneTags,
  getFightSceneRoundNumbers,
} from "@/lib/fight-scenes";
import { FightSceneSection } from "@/components/fight-scene-section";

// Matches FightSceneSection's own SCENES_PAGE_SIZE -- handing it exactly one
// page's worth (or fewer) means its internal "Show more" never has anything
// left to reveal, so real pagination lives entirely at this page level
// without needing a new prop on the component.
const PAGE_SIZE = 6;

const SORT_OPTIONS = [
  { value: "round", label: "Round Order" },
  { value: "newest", label: "Newest First" },
  { value: "rating", label: "Highest Rated" },
  { value: "favorites", label: "Most Favorited" },
] as const;

interface FightsPageSearchParams {
  sort?: string;
  tag?: string;
  verified?: string;
  page?: string;
}

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

function bubbleClass(active: boolean) {
  return `rounded-full border px-3.5 py-2.5 text-xs font-medium whitespace-nowrap ${
    active
      ? "border-red-600 bg-red-950/40 text-red-300"
      : "border-neutral-700 text-neutral-300 hover:border-neutral-500 hover:text-white"
  }`;
}

function pageHref(movieId: string, params: FightsPageSearchParams, page: number) {
  const search = new URLSearchParams();
  if (params.sort && params.sort !== "round") search.set("sort", params.sort);
  if (params.tag) search.set("tag", params.tag);
  if (params.verified) search.set("verified", params.verified);
  if (page > 1) search.set("page", String(page));
  const qs = search.toString();
  return qs ? `/movies/${movieId}/fights?${qs}` : `/movies/${movieId}/fights`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const movie = await prisma.movie.findUnique({
    where: { id },
    select: { title: true, posterPath: true, posterOverrideUrl: true },
  });
  if (!movie) return {};

  const count = await prisma.fightScene.count({ where: { movieId: id, isDeleted: false } });
  const title = `Fights — ${movie.title}`;
  const description =
    count > 0 ? `${count} fight scene${count === 1 ? "" : "s"} from ${movie.title}` : `Fight scenes from ${movie.title}`;
  const image = resolvePosterUrl(movie, "w500");

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function MovieFightsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<FightsPageSearchParams>;
}) {
  const { id: movieId } = await params;
  const sp = await searchParams;
  const session = await auth();

  const movie = await prisma.movie.findUnique({
    where: { id: movieId },
    select: { id: true, title: true, status: true, submittedById: true },
  });
  if (!movie || !isMovieVisible(movie, session)) {
    notFound();
  }

  const sort = SORT_OPTIONS.some((o) => o.value === sp.sort) ? sp.sort! : "round";
  const verifiedOnly = sp.verified === "1";
  const selectedTag = sp.tag?.trim() ?? "";
  const hasFilters = verifiedOnly || selectedTag.length > 0;

  const [movieCast, allFightScenes, tagOptions, myMemberLists, myFightSceneFavorites, fightSceneRoundNumbers] =
    await Promise.all([
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
      getFightSceneRoundNumbers(movieId),
    ]);

  const fightSceneIds = allFightScenes.map((s) => s.id);
  const [fightSceneRatingSummaries, fightSceneAdminRatingSummaries, myFightSceneRatings, myFightSceneAdminRatings, favoriteCounts] =
    await Promise.all([
      getFightSceneRatingSummaries(fightSceneIds),
      getFightSceneAdminRatingSummaries(fightSceneIds),
      session?.user
        ? prisma.fightSceneRating.findMany({ where: { userId: session.user.id, fightSceneId: { in: fightSceneIds } } })
        : [],
      session?.user?.role === "ADMIN"
        ? prisma.fightSceneAdminRating.findMany({ where: { adminId: session.user.id, fightSceneId: { in: fightSceneIds } } })
        : [],
      getFightSceneFavoriteCounts(fightSceneIds),
    ]);

  // Tags actually used on this movie's own scenes, not the full site
  // vocabulary -- a quick-filter row scoped to what's actually here, kept
  // separate from tagOptions below (the full list the add/edit form offers).
  const usedTagsMap = new Map<string, { id: string; name: string }>();
  for (const scene of allFightScenes) {
    for (const tag of scene.tags) usedTagsMap.set(tag.id, tag);
  }
  const usedTags = [...usedTagsMap.values()].sort((a, b) => a.name.localeCompare(b.name));

  let filteredScenes = allFightScenes;
  if (verifiedOnly) filteredScenes = filteredScenes.filter((s) => s.isVerified);
  if (selectedTag) filteredScenes = filteredScenes.filter((s) => s.tags.some((t) => t.name === selectedTag));

  // "round" is already the fetch order (createdAt asc), so no re-sort needed.
  if (sort === "newest") {
    filteredScenes = [...filteredScenes].reverse();
  } else if (sort === "rating") {
    filteredScenes = [...filteredScenes].sort(
      (a, b) => (fightSceneRatingSummaries.get(b.id)?.average ?? -1) - (fightSceneRatingSummaries.get(a.id)?.average ?? -1),
    );
  } else if (sort === "favorites") {
    filteredScenes = [...filteredScenes].sort((a, b) => (favoriteCounts.get(b.id) ?? 0) - (favoriteCounts.get(a.id) ?? 0));
  }

  const totalFilteredCount = filteredScenes.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredCount / PAGE_SIZE));
  const page = Math.min(Math.max(1, Number(sp.page) || 1), totalPages);
  const pagedScenes = filteredScenes.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const castOptions = movieCast.map((credit) => ({ id: credit.person.id, name: credit.person.name }));
  const myMemberListItems = myMemberLists.map((list) => ({ id: list.id, name: list.name }));
  const myFavoriteFightSceneIds = myFightSceneFavorites.map((e) => e.fightSceneId);

  // Only for the scenes actually rendered on this page, not every scene.
  const mySavedFightSceneListIds: Record<string, string[]> = {};
  for (const scene of pagedScenes) {
    mySavedFightSceneListIds[scene.id] = myMemberLists
      .filter((list) => list.fightSceneEntries.some((e) => e.fightSceneId === scene.id))
      .map((list) => list.id);
  }

  const serializedFightScenes = pagedScenes.map((scene) => {
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

      {(allFightScenes.length > 0 || hasFilters) && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {SORT_OPTIONS.map((o) => (
            <Link key={o.value} href={pageHref(movieId, { ...sp, sort: o.value }, 1)} className={bubbleClass(sort === o.value)}>
              {o.label}
            </Link>
          ))}
          <Link href={pageHref(movieId, { ...sp, verified: "1" }, 1)} className={bubbleClass(verifiedOnly)}>
            ✓ Verified only
          </Link>
          {usedTags.map((t) => (
            <Link
              key={t.id}
              href={pageHref(movieId, { ...sp, tag: t.name }, 1)}
              className={bubbleClass(selectedTag === t.name)}
            >
              {t.name}
            </Link>
          ))}
          {(hasFilters || sort !== "round") && (
            <Link href={`/movies/${movieId}/fights`} className="text-sm text-neutral-400 hover:text-white">
              Clear
            </Link>
          )}
        </div>
      )}

      {hasFilters && totalFilteredCount === 0 && (
        <p className="mb-4 text-sm text-neutral-400">
          No fights match this filter.{" "}
          <Link href={`/movies/${movieId}/fights`} className="text-red-500 hover:underline">
            Clear filters
          </Link>
        </p>
      )}

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

      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-4 text-sm">
          {page > 1 ? (
            <Link href={pageHref(movieId, sp, page - 1)} className="text-red-500 hover:underline">
              ← Previous
            </Link>
          ) : (
            <span className="text-neutral-600">← Previous</span>
          )}
          <span className="text-neutral-400">
            Page {page} of {totalPages} ({totalFilteredCount} fights)
          </span>
          {page < totalPages ? (
            <Link href={pageHref(movieId, sp, page + 1)} className="text-red-500 hover:underline">
              Next →
            </Link>
          ) : (
            <span className="text-neutral-600">Next →</span>
          )}
        </div>
      )}
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
