import type { MetadataRoute } from "next";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { PUBLIC_LIST_WHERE, NON_EMPTY_WHERE } from "@/lib/lists";

// Forces this route to render per-request rather than at build time. A
// metadata route with no dynamic segments is otherwise a candidate for
// build-time static generation, which would run the Prisma queries below
// during `next build` — breaking the CI invariant that the build needs no
// live database connection (see README.md's Continuous Integration section
// and the Sentry build-wrapper note it points to).
export const dynamic = "force-dynamic";

const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

// The route itself still runs on every request (see `dynamic` above), but
// the actual data fetch is cached for an hour via Next's Data Cache, so a
// crawler re-fetching the sitemap doesn't re-run every query below on every
// hit — the exact "any request reaches the database" cost the Neon compute
// fix (see DECISIONS.md) addressed elsewhere. This is what gets the caching
// benefit `revalidate` would have given a static route, without triggering
// build-time generation.
const getSitemapData = unstable_cache(
  async () => {
    const [movies, fightScenes, people, collections, lists] = await Promise.all([
      // Only APPROVED movies — a pending member submission 404s for everyone
      // but its submitter and admins, so it has no public URL to list.
      prisma.movie.findMany({
        where: { status: "APPROVED" },
        select: { id: true, lastSyncedAt: true },
      }),
      prisma.fightScene.findMany({
        where: { isDeleted: false, movie: { status: "APPROVED" } },
        select: { id: true, movieId: true, updatedAt: true },
      }),
      // An actor page is only worth indexing if it has at least one credit in
      // an approved movie — a Person row tied solely to a still-pending
      // submission would otherwise get a page with nothing public to show.
      prisma.person.findMany({
        where: { castCredits: { some: { movie: { status: "APPROVED" } } } },
        select: { id: true },
      }),
      // Collection pages are keyed by TMDB's collection id, not our own —
      // distinct non-null values among approved movies, same scoping as the
      // movies query above.
      prisma.movie.findMany({
        where: { status: "APPROVED", collectionTmdbId: { not: null } },
        select: { collectionTmdbId: true },
        distinct: ["collectionTmdbId"],
      }),
      // Same "public and worth browsing" definition /lists itself uses — a
      // private or empty list has no business showing up in search results.
      prisma.memberList.findMany({
        where: { AND: [PUBLIC_LIST_WHERE, NON_EMPTY_WHERE] },
        select: { id: true, updatedAt: true },
      }),
    ]);
    return { movies, fightScenes, people, collections, lists };
  },
  ["sitemap-data"],
  { revalidate: 3600 },
);

// Google caps a single sitemap file at 50,000 URLs. This catalog is nowhere
// close (see the trigram-index note in DECISIONS.md on current data
// volume), so one flat file is fine for now — Next's `generateSitemaps()`
// multi-file convention is the escape hatch if that ever changes, not
// something to build ahead of actually needing it.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { movies, fightScenes, people, collections, lists } = await getSitemapData();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: baseUrl, changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/about`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${baseUrl}/news`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${baseUrl}/tops`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${baseUrl}/tops/movies`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${baseUrl}/tops/fights`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${baseUrl}/hall-of-fame`, changeFrequency: "weekly", priority: 0.4 },
    { url: `${baseUrl}/lists`, changeFrequency: "daily", priority: 0.5 },
    { url: `${baseUrl}/terms`, changeFrequency: "yearly", priority: 0.1 },
    { url: `${baseUrl}/privacy`, changeFrequency: "yearly", priority: 0.1 },
  ];

  const movieEntries: MetadataRoute.Sitemap = movies.map((movie) => ({
    url: `${baseUrl}/movies/${movie.id}`,
    lastModified: movie.lastSyncedAt,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const fightScenePageEntries: MetadataRoute.Sitemap = movies.map((movie) => ({
    url: `${baseUrl}/movies/${movie.id}/fights`,
    lastModified: movie.lastSyncedAt,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const fightSceneEntries: MetadataRoute.Sitemap = fightScenes.map((scene) => ({
    url: `${baseUrl}/movies/${scene.movieId}/fights/${scene.id}`,
    lastModified: scene.updatedAt,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const actorEntries: MetadataRoute.Sitemap = people.map((person) => ({
    url: `${baseUrl}/actors/${person.id}`,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const collectionEntries: MetadataRoute.Sitemap = collections
    .filter((movie): movie is { collectionTmdbId: number } => movie.collectionTmdbId !== null)
    .map((movie) => ({
      url: `${baseUrl}/collections/${movie.collectionTmdbId}`,
      changeFrequency: "monthly",
      priority: 0.5,
    }));

  const listEntries: MetadataRoute.Sitemap = lists.map((list) => ({
    url: `${baseUrl}/lists/${list.id}`,
    lastModified: list.updatedAt,
    changeFrequency: "weekly",
    priority: 0.4,
  }));

  return [
    ...staticEntries,
    ...movieEntries,
    ...fightScenePageEntries,
    ...fightSceneEntries,
    ...actorEntries,
    ...collectionEntries,
    ...listEntries,
  ];
}
