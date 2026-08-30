import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRatingSummaries } from "@/lib/ratings";
import { getFightSceneRatingSummaries, getFightSceneAdminRatingSummaries } from "@/lib/fight-scenes";
import { MovieCard } from "@/components/movie-card";
import { FightSceneResultCard, type FightSceneResult } from "@/components/fight-scene-result-card";
import type { AddToListItem } from "@/components/add-to-list-control";
import { MemberListManager } from "@/components/member-list-manager";
import { MemberProfileDetailsEditor } from "@/components/member-profile-details-editor";
import { MemberPasswordEditor } from "@/components/member-password-editor";
import { ProfileTabs } from "@/components/profile-tabs";
import { ListsPanel } from "@/components/lists-panel";
import { ProfileStatsStrip } from "@/components/profile-stats-strip";
import { ActivityFeed, ListCard } from "@/components/activity-feed";
import { getRecentActivity } from "@/lib/activity";
import { detectSocialPlatform } from "@/lib/profile";
import { MEMBER_LIST_PROFILE_PREVIEW_LIMIT } from "@/lib/member-lists";
import { SocialIcon } from "@/components/social-icon";
import type { Movie } from "@/generated/prisma/client";

const fightSceneCardInclude = {
  movie: { select: { id: true, title: true, releaseDate: true } as const },
  tags: true,
  cast: { orderBy: { order: "asc" as const }, include: { person: true } },
} as const;

async function MovieRow({
  title,
  movies,
  ratingSummaries,
}: {
  // Omitted when rendered as a tab panel — the tab label already names the
  // section, so repeating it as a heading inside the panel is redundant.
  title?: string;
  movies: Pick<Movie, "id" | "title" | "releaseDate" | "posterPath" | "posterOverrideUrl" | "tmdbRating">[];
  ratingSummaries: Awaited<ReturnType<typeof getRatingSummaries>>;
}) {
  return (
    <section className="mb-8">
      {title && <h2 className="mb-4 text-lg font-semibold text-white">{title}</h2>}
      {movies.length === 0 ? (
        <p className="text-sm text-neutral-400">Nothing here yet.</p>
      ) : (
        <div className="flex flex-wrap gap-4">
          {movies.map((movie) => {
            const summary = ratingSummaries.get(movie.id);
            return (
              <MovieCard
                key={movie.id}
                size="compact"
                movie={{
                  ...movie,
                  communityAverage: summary?.average ?? null,
                  communityCount: summary?.count ?? 0,
                }}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}

function FightSceneRow({
  title,
  scenes,
  signedIn,
}: {
  // Omitted when rendered as a tab panel — see MovieRow's title comment.
  title?: string;
  scenes: (FightSceneResult & { initialLists: AddToListItem[]; initialFavorite: boolean })[];
  signedIn: boolean;
}) {
  return (
    <section className="mb-8">
      {title && <h2 className="mb-4 text-lg font-semibold text-white">{title}</h2>}
      {scenes.length === 0 ? (
        <p className="text-sm text-neutral-400">Nothing here yet.</p>
      ) : (
        <div className="flex flex-wrap gap-4">
          {scenes.map((scene) => (
            <FightSceneResultCard
              key={scene.id}
              scene={scene}
              initialLists={scene.initialLists}
              signedIn={signedIn}
              initialFavorite={scene.initialFavorite}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default async function MemberProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const session = await auth();

  // Case-insensitive: /members/NashPopoB and /members/nashpopob resolve to
  // the same profile, matching usernameLower being the real uniqueness key.
  const profileUser = await prisma.user.findUnique({ where: { usernameLower: username.toLowerCase() } });
  if (!profileUser) {
    notFound();
  }

  // Favorites/Watchlist have always been private — only the owner ever sees
  // their own, on this page or anywhere else. Custom lists are public by
  // design (see README's Member Lists section), so anyone gets those, but a
  // pending (not yet admin-approved) movie inside one is still hidden from
  // everyone except the list owner, same as every other public listing.
  const isOwner = session?.user?.id === profileUser.id;

  const [entries, pendingSubmissions, fightSceneFavoriteEntries, memberLists, likedListEntries, recentActivity] =
    await Promise.all([
      isOwner
        ? prisma.listEntry.findMany({
            where: { userId: profileUser.id },
            include: { movie: true },
            orderBy: { createdAt: "desc" },
          })
        : [],
      // Only the submitter (or an admin) can even load a pending movie's own
      // page — same visibility rule as everywhere else a pending movie shows.
      isOwner
        ? prisma.movie.findMany({
            where: { submittedById: profileUser.id, status: "PENDING" },
            orderBy: { createdAt: "desc" },
          })
        : [],
      isOwner
        ? prisma.fightSceneFavorite.findMany({
            where: { userId: profileUser.id },
            include: { fightScene: { include: fightSceneCardInclude } },
            orderBy: { createdAt: "desc" },
          })
        : [],
      // Capped to MEMBER_LIST_PROFILE_PREVIEW_LIMIT per relation — unlike
      // /lists/[listId] (a single list, fully rendered), this page loads
      // every list a member owns in one request, so an unbounded fetch here
      // scales with (list count) × (items per list) on every profile visit.
      // `_count` carries the true totals so the UI can link out to the full
      // list rather than silently showing a partial one.
      prisma.memberList.findMany({
        where: { userId: profileUser.id },
        include: {
          entries: {
            include: { movie: true },
            orderBy: { createdAt: "desc" },
            take: MEMBER_LIST_PROFILE_PREVIEW_LIMIT,
          },
          fightSceneEntries: {
            include: { fightScene: { include: fightSceneCardInclude } },
            orderBy: { createdAt: "desc" },
            take: MEMBER_LIST_PROFILE_PREVIEW_LIMIT,
          },
          _count: { select: { entries: true, fightSceneEntries: true } },
        },
        orderBy: { createdAt: "asc" },
      }),
      // Which lists this member has liked — unlike lists themselves, a like
      // is never shown publicly anywhere else in the app (list permalinks
      // only ever show an aggregate count), so this stays owner-only too.
      isOwner
        ? prisma.memberListLike.findMany({
            where: { userId: profileUser.id },
            include: { list: { include: { user: { select: { username: true } } } } },
            orderBy: { createdAt: "desc" },
          })
        : [],
      // Same feed as the homepage's Community Activity section, scoped to
      // just this member — already fully public data (every visitor already
      // sees it there), so this is shown on both owner and non-owner views.
      getRecentActivity(5, profileUser.id),
    ]);

  // Public contribution counts, shown to any visitor — same reasoning as the
  // Activity tab: this is a summary of already-public activity (submitted
  // movies/fight scenes are visible on the site once approved/verified),
  // not new exposure of anything private. Ratings/discussion counts are a
  // smaller step further: no individual rating or post is newly exposed by
  // this (ratings already aggregate anonymously into a movie's community
  // score, and discussion posts are already public with attribution), just
  // an aggregate "how much" number, same spirit as the submission counts.
  const [moviesSubmitted, moviesApproved, fightScenesSubmitted, fightScenesVerified, moviesRated, fightScenesRated, discussionPosts] =
    await Promise.all([
      prisma.movie.count({ where: { submittedById: profileUser.id } }),
      prisma.movie.count({ where: { submittedById: profileUser.id, status: "APPROVED" } }),
      prisma.fightScene.count({ where: { submittedById: profileUser.id, isDeleted: false } }),
      prisma.fightScene.count({ where: { submittedById: profileUser.id, isDeleted: false, isVerified: true } }),
      prisma.rating.count({ where: { userId: profileUser.id } }),
      prisma.fightSceneRating.count({ where: { userId: profileUser.id } }),
      // Posts and replies both count — distinct from the Activity tab, which
      // only ever shows the 5 most recent top-level posts, not a total.
      prisma.discussionPost.count({ where: { userId: profileUser.id, isDeleted: false } }),
    ]);

  const favorites = entries.filter((e) => e.listType === "FAVORITE").map((e) => e.movie);
  const watchlist = entries.filter((e) => e.listType === "WATCHLIST").map((e) => e.movie);

  // Same reasoning as pending movies: a soft-deleted fight scene shouldn't
  // linger visibly just because it was favorited before deletion.
  const favoriteFightScenes = fightSceneFavoriteEntries
    .filter((e) => !e.fightScene.isDeleted)
    .map((e) => e.fightScene);

  const visibleMemberLists = memberLists.map((list) => ({
    ...list,
    entries: isOwner ? list.entries : list.entries.filter((entry) => entry.movie.status === "APPROVED"),
    // Same reasoning as pending movies: a soft-deleted fight scene shouldn't
    // linger visibly just because it was saved before deletion.
    fightSceneEntries: list.fightSceneEntries.filter((entry) => !entry.fightScene.isDeleted),
  }));

  const allListedMovieIds = [
    ...favorites,
    ...watchlist,
    ...pendingSubmissions,
    ...visibleMemberLists.flatMap((list) => list.entries.map((entry) => entry.movie)),
  ].map((m) => m.id);
  const ratingSummaries = await getRatingSummaries(allListedMovieIds);

  const withRatings = (movie: Movie) => ({
    ...movie,
    communityAverage: ratingSummaries.get(movie.id)?.average ?? null,
    communityCount: ratingSummaries.get(movie.id)?.count ?? 0,
  });

  const allListedFightScenesById = new Map(
    [...visibleMemberLists.flatMap((list) => list.fightSceneEntries.map((e) => e.fightScene)), ...favoriteFightScenes].map(
      (scene) => [scene.id, scene],
    ),
  );
  const allListedFightScenes = [...allListedFightScenesById.values()];
  const [memberSceneSummaries, editorSceneSummaries] = await Promise.all([
    getFightSceneRatingSummaries(allListedFightScenes.map((s) => s.id)),
    getFightSceneAdminRatingSummaries(allListedFightScenes.map((s) => s.id)),
  ]);

  // Not profileUser's own lists — the *viewer's* lists, so they can bookmark
  // a scene found here into one of their own, same as every other page a
  // fight scene card appears on.
  const viewerMemberLists = session?.user
    ? await prisma.memberList.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "asc" },
        include: {
          fightSceneEntries: {
            where: { fightSceneId: { in: allListedFightScenes.map((s) => s.id) } },
            select: { fightSceneId: true },
          },
        },
      })
    : [];
  const viewerMemberListItems = viewerMemberLists.map((l) => ({ id: l.id, name: l.name }));

  // Same "viewer's own state, not the profile owner's" reasoning as
  // viewerMemberLists above — the favorite icon reflects who's looking,
  // regardless of whose profile the scene is shown on.
  const viewerFightSceneFavorites = session?.user
    ? await prisma.fightSceneFavorite.findMany({
        where: { userId: session.user.id, fightSceneId: { in: allListedFightScenes.map((s) => s.id) } },
      })
    : [];

  const withSceneRatings = (scene: (typeof allListedFightScenes)[number]) => ({
    ...scene,
    memberRatingAverage: memberSceneSummaries.get(scene.id)?.average ?? null,
    memberRatingCount: memberSceneSummaries.get(scene.id)?.count ?? 0,
    editorRatingAverage: editorSceneSummaries.get(scene.id)?.average ?? null,
    editorRatingCount: editorSceneSummaries.get(scene.id)?.count ?? 0,
  });

  const sceneInitialLists = (sceneId: string) =>
    viewerMemberListItems.map((l) => {
      const listRow = viewerMemberLists.find((row) => row.id === l.id)!;
      return { ...l, hasItem: listRow.fightSceneEntries.some((e) => e.fightSceneId === sceneId) };
    });

  const withSceneListState = (scene: (typeof allListedFightScenes)[number]) => ({
    ...withSceneRatings(scene),
    initialLists: sceneInitialLists(scene.id),
    initialFavorite: viewerFightSceneFavorites.some((e) => e.fightSceneId === scene.id),
  });

  const memberListData = visibleMemberLists.map((list) => ({
    id: list.id,
    name: list.name,
    movies: list.entries.map((entry) => withRatings(entry.movie)),
    fightScenes: list.fightSceneEntries.map((entry) => withSceneListState(entry.fightScene)),
    // True totals, not just what's shown — the queries above cap each
    // relation at MEMBER_LIST_PROFILE_PREVIEW_LIMIT, so a list bigger than
    // that needs to tell the UI more exists rather than silently truncating.
    totalMovieCount: list._count.entries,
    totalFightSceneCount: list._count.fightSceneEntries,
  }));

  const favoriteFightSceneData = favoriteFightScenes.map(withSceneListState);

  const likedLists = likedListEntries.map((like) => ({
    id: like.id,
    createdAt: like.createdAt,
    username: like.list.user.username,
    listId: like.list.id,
    listName: like.list.name,
  }));

  const listsPanel =
    memberListData.length === 0 && !isOwner ? (
      <p className="text-sm text-neutral-500">No public lists yet.</p>
    ) : isOwner ? (
      <MemberListManager initialLists={memberListData} viewerSignedIn={!!session?.user} />
    ) : (
      memberListData.map((list) => {
        const shownCount = list.movies.length + list.fightScenes.length;
        const totalCount = list.totalMovieCount + list.totalFightSceneCount;
        return (
          <section key={list.id} className="mb-8">
            <div className="mb-3 flex items-center gap-3">
              <h3 className="text-lg font-semibold text-white">{list.name}</h3>
              <Link href={`/lists/${list.id}`} className="text-xs text-neutral-400 underline hover:text-white">
                Permalink
              </Link>
            </div>
            {list.movies.length === 0 && list.fightScenes.length === 0 ? (
              <p className="text-sm text-neutral-400">Nothing in this list yet.</p>
            ) : (
              <div className="flex flex-wrap items-end gap-4">
                {list.movies.map((movie) => (
                  <MovieCard key={movie.id} movie={movie} size="compact" />
                ))}
                {list.fightScenes.map((scene) => (
                  <FightSceneResultCard
                    key={scene.id}
                    scene={scene}
                    initialLists={scene.initialLists}
                    signedIn={!!session?.user}
                    initialFavorite={scene.initialFavorite}
                    size="compact"
                  />
                ))}
                {totalCount > shownCount && (
                  <Link
                    href={`/lists/${list.id}`}
                    className="flex h-28 w-28 shrink-0 items-center justify-center rounded-md border border-neutral-800 text-center text-xs text-neutral-400 hover:border-neutral-600 hover:text-white"
                  >
                    View full list
                    <br />({totalCount - shownCount} more)
                  </Link>
                )}
              </div>
            )}
          </section>
        );
      })
    );

  const socialPlatform = profileUser.websiteUrl ? detectSocialPlatform(profileUser.websiteUrl) : null;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold text-white">{profileUser.username}</h1>

      {!isOwner && (profileUser.bio || profileUser.location || profileUser.websiteUrl) && (
        <div className="mb-6 flex flex-col gap-1">
          {profileUser.bio && (
            <p className="max-w-xl text-sm whitespace-pre-wrap text-neutral-300">{profileUser.bio}</p>
          )}
          {profileUser.location && <p className="text-xs text-neutral-500">{profileUser.location}</p>}
          {profileUser.websiteUrl && socialPlatform && (
            <a
              href={profileUser.websiteUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex w-fit items-center gap-1.5 text-xs text-red-500 hover:underline"
            >
              <SocialIcon id={socialPlatform.id} className="h-3.5 w-3.5" />
              {socialPlatform.label}
            </a>
          )}
        </div>
      )}

      <ProfileStatsStrip
        memberSince={profileUser.createdAt}
        moviesSubmitted={moviesSubmitted}
        moviesApproved={moviesApproved}
        fightScenesSubmitted={fightScenesSubmitted}
        fightScenesVerified={fightScenesVerified}
        moviesRated={moviesRated}
        fightScenesRated={fightScenesRated}
        discussionPosts={discussionPosts}
      />

      {isOwner ? (
        <ProfileTabs
          tabs={[
            {
              key: "profile",
              label: "Profile",
              content: (
                <>
                  <MemberProfileDetailsEditor
                    initialBio={profileUser.bio}
                    initialLocation={profileUser.location}
                    initialWebsiteUrl={profileUser.websiteUrl}
                  />
                  <MemberPasswordEditor hasPassword={!!profileUser.passwordHash} />
                </>
              ),
            },
            {
              key: "activity",
              label: "Activity",
              content: <ActivityFeed activity={recentActivity} title={null} />,
            },
            {
              key: "favorites",
              label: `Favorites (${favorites.length})`,
              content: <MovieRow movies={favorites} ratingSummaries={ratingSummaries} />,
            },
            {
              key: "watchlist",
              label: `Watchlist (${watchlist.length})`,
              content: <MovieRow movies={watchlist} ratingSummaries={ratingSummaries} />,
            },
            {
              key: "pending",
              label: `Pending (${pendingSubmissions.length})`,
              content: <MovieRow movies={pendingSubmissions} ratingSummaries={ratingSummaries} />,
            },
            {
              key: "fight-scenes",
              label: `Fights (${favoriteFightSceneData.length})`,
              content: <FightSceneRow scenes={favoriteFightSceneData} signedIn={!!session?.user} />,
            },
            {
              key: "lists",
              label: `Lists (${memberListData.length})`,
              content: (
                <ListsPanel
                  mineLabel={`My Lists (${memberListData.length})`}
                  mineContent={listsPanel}
                  likedLabel={`Liked (${likedLists.length})`}
                  likedContent={
                    likedLists.length === 0 ? (
                      <p className="text-sm text-neutral-400">Nothing here yet.</p>
                    ) : (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        {likedLists.map((item) => (
                          <ListCard key={item.id} item={item} />
                        ))}
                      </div>
                    )
                  }
                />
              ),
            },
          ]}
        />
      ) : (
        <ProfileTabs
          tabs={[
            {
              key: "lists",
              label: "Lists",
              content: (
                <>
                  <h2 className="mb-4 text-xl font-bold text-white">Lists</h2>
                  {listsPanel}
                </>
              ),
            },
            {
              key: "activity",
              label: "Activity",
              content: <ActivityFeed activity={recentActivity} title={null} />,
            },
          ]}
        />
      )}
    </div>
  );
}
