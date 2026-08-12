import Link from "next/link";
import { getMostLikedLists, getTopCurators } from "@/lib/leaderboard";

export default async function LeaderboardPage() {
  const [mostLikedLists, topCurators] = await Promise.all([getMostLikedLists(), getTopCurators()]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">Leaderboard</h1>
        <Link href="/lists" className="text-sm text-red-500 hover:underline">
          Browse all lists →
        </Link>
      </div>

      <section className="mb-10">
        <h2 className="mb-4 text-lg font-semibold text-white">Most-Liked Lists</h2>
        {mostLikedLists.length === 0 ? (
          <p className="text-sm text-neutral-400">No liked lists yet — be the first to like one.</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {mostLikedLists.map((list, i) => (
              <li
                key={list.id}
                className="flex items-center gap-4 rounded-md border border-neutral-800 bg-neutral-900 px-4 py-3"
              >
                <span className="w-6 shrink-0 text-right text-sm text-neutral-500">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <Link href={`/lists/${list.id}`} className="font-medium text-white hover:text-red-400">
                    {list.name}
                  </Link>
                  <p className="text-xs text-neutral-500">
                    by {list.username} · {list.movieCount} {list.movieCount === 1 ? "movie" : "movies"}
                  </p>
                </div>
                <span className="shrink-0 text-sm text-neutral-300">
                  ♥ {list.likeCount}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-white">Top Curators</h2>
        {topCurators.length === 0 ? (
          <p className="text-sm text-neutral-400">No member lists yet — create one from a movie&apos;s page.</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {topCurators.map((curator, i) => (
              <li
                key={curator.username}
                className="flex items-center gap-4 rounded-md border border-neutral-800 bg-neutral-900 px-4 py-3"
              >
                <span className="w-6 shrink-0 text-right text-sm text-neutral-500">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <Link href={`/members/${curator.username}`} className="font-medium text-white hover:text-red-400">
                    {curator.username}
                  </Link>
                  <p className="text-xs text-neutral-500">
                    {curator.listCount} {curator.listCount === 1 ? "list" : "lists"}
                  </p>
                </div>
                <span className="shrink-0 text-sm text-neutral-300">
                  {curator.movieCount} {curator.movieCount === 1 ? "movie" : "movies"}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
