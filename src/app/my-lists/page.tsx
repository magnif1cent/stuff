import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRatingSummaries } from "@/lib/ratings";
import { MovieCard } from "@/components/movie-card";

async function MovieRow({ title, movies, ratingSummaries }: {
  title: string;
  movies: { id: string; title: string; releaseDate: Date | null; posterPath: string | null; tmdbRating: number | null }[];
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

  const entries = await prisma.listEntry.findMany({
    where: { userId: session.user.id },
    include: { movie: true },
    orderBy: { createdAt: "desc" },
  });

  const favorites = entries.filter((e) => e.listType === "FAVORITE").map((e) => e.movie);
  const watchlist = entries.filter((e) => e.listType === "WATCHLIST").map((e) => e.movie);
  const ratingSummaries = await getRatingSummaries([...favorites, ...watchlist].map((m) => m.id));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold text-white">My Lists</h1>
      <MovieRow title="Favorites" movies={favorites} ratingSummaries={ratingSummaries} />
      <MovieRow title="Watchlist" movies={watchlist} ratingSummaries={ratingSummaries} />
    </div>
  );
}
