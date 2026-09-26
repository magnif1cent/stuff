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
import { PUBLIC_LIST_WHERE, getMemberListCards } from "@/lib/lists";
import { timeAgo } from "@/lib/time-ago";
import { MemberListCard } from "@/components/member-list-card";
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
  // their own, on this page or anywhere else. Custom lists are public unless
  // their owner marks one private (see README's Member Lists section), so
  // anyone gets the public ones, but a pending (not yet admin-approved) movie inside one is still hidden from
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
      // One summary card per list (cover, description, counts) rather than
      // the lists' items — see getMemberListCards. Private lists only for
      // the owner.
      getMemberListCards(profileUser.id, isOwner),
      // Which lists this member has liked — unlike lists themselves, a like
      // is never shown publicly anywhere else in the app (list permalinks
      // only ever show an aggregate count), so this stays owner-only too.
      isOwner
        ? prisma.memberListLike.findMany({
            // A liked list its owner has since made private drops out of
            // here (the like row itself is kept, and reappears if the list
            // goes public again).
            where: { userId: profileUser.id, list: PUBLIC_LIST_WHERE },
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


  const allListedMovieIds = [
    ...favorites,
    ...watchlist,
    ...pendingSubmissions,
  ].map((m) => m.id);
  const ratingSummaries = await getRatingSummaries(allListedMovieIds);

  const allListedFightScenes = favoriteFightScenes;
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

  const memberListCards = memberLists.map(({ updatedAt, ...list }) => ({ ...list, updatedLabel: timeAgo(updatedAt) }));

  const favoriteFightSceneData = favoriteFightScenes.map(withSceneListState);

  const likedLists = likedListEntries.map((like) => ({
    id: like.id,
    createdAt: like.createdAt,
    username: like.list.user.username,
    listId: like.list.id,
    listName: like.list.name,
  }));

  const listsPanel = isOwner ? (
    <MemberListManager initialLists={memberListCards} />
  ) : memberListCards.length === 0 ? (
    <p className="text-sm text-neutral-500">No public lists yet.</p>
  ) : (
    <div className="grid gap-3.5 md:grid-cols-2">
      {memberListCards.map((list) => (
        <MemberListCard key={list.id} list={list} />
      ))}
    </div>
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
              label: `Lists (${memberListCards.length})`,
              content: (
                <ListsPanel
                  mineLabel={`My Lists (${memberListCards.length})`}
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
