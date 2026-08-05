import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRatingSummaries } from "@/lib/ratings";
import { MovieCard } from "@/components/movie-card";
import { MemberListManager } from "@/components/member-list-manager";
import type { Movie } from "@/generated/prisma/client";

async function MovieRow({ title, movies, ratingSummaries }: {
  title: string;
  movies: Pick<Movie, "id" | "title" | "releaseDate" | "posterPath" | "posterOverrideUrl" | "tmdbRating">[];
  ratingSummaries: Awaited<ReturnType<typeof getRatingSummaries>>;
}) {
  return (
    <section className="mb-8">
      <h2 className="mb-4 text-lg font-semibold text-white">{title}</h2>
      {movies.length === 0 ? (
        <p className="text-sm text-neutral-400">Nothing here yet.</p>
      ) : (
        <div className="flex flex-wrap gap-4">
          {movies.map((movie) => {
            const summary = ratingSummaries.get(movie.id);
            return (
              <MovieCard
                key={movie.id}
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

export default async function MyListsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/my-lists");
  }

  const [entries, memberLists] = await Promise.all([
    prisma.listEntry.findMany({
      where: { userId: session.user.id },
      include: { movie: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.memberList.findMany({
      where: { userId: session.user.id },
      include: { entries: { include: { movie: true }, orderBy: { createdAt: "desc" } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const favorites = entries.filter((e) => e.listType === "FAVORITE").map((e) => e.movie);
  const watchlist = entries.filter((e) => e.listType === "WATCHLIST").map((e) => e.movie);

  const allListedMovieIds = [
    ...favorites,
    ...watchlist,
    ...memberLists.flatMap((list) => list.entries.map((entry) => entry.movie)),
  ].map((m) => m.id);
  const ratingSummaries = await getRatingSummaries(allListedMovieIds);

  const withRatings = (movie: Movie) => ({
    ...movie,
    communityAverage: ratingSummaries.get(movie.id)?.average ?? null,
    communityCount: ratingSummaries.get(movie.id)?.count ?? 0,
  });

  const memberListData = memberLists.map((list) => ({
    id: list.id,
    name: list.name,
    movies: list.entries.map((entry) => withRatings(entry.movie)),
  }));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold text-white">My Lists</h1>
      <MovieRow title="Favorites" movies={favorites} ratingSummaries={ratingSummaries} />
      <MovieRow title="Watchlist" movies={watchlist} ratingSummaries={ratingSummaries} />

      <h2 className="mb-4 text-xl font-bold text-white">Your Lists</h2>
      <MemberListManager initialLists={memberListData} />
    </div>
  );
}
