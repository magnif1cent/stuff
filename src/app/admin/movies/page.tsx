import { prisma } from "@/lib/prisma";
import { AdminMovieList } from "@/components/admin-movie-list";
import { AdminPendingMovies } from "@/components/admin-pending-movies";

export default async function AdminMoviesPage() {
  const [movies, pending] = await Promise.all([
    prisma.movie.findMany({
      where: { status: "APPROVED" },
      orderBy: { title: "asc" },
      select: {
        id: true,
        title: true,
        releaseDate: true,
        _count: { select: { ratings: true, discussionPosts: true, fightScenes: true } },
      },
    }),
    prisma.movie.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        title: true,
        releaseDate: true,
        submittedBy: { select: { username: true } },
      },
    }),
  ]);

  const serializedMovies = movies.map((movie) => ({
    ...movie,
    releaseDate: movie.releaseDate?.toISOString() ?? null,
  }));
  const serializedPending = pending.map((movie) => ({
    ...movie,
    releaseDate: movie.releaseDate?.toISOString() ?? null,
  }));

  return (
    <div className="max-w-3xl">
      <h1 className="mb-2 text-2xl font-bold text-white">Movies</h1>

      {serializedPending.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-2 text-lg font-semibold text-white">Pending Submissions</h2>
          <p className="mb-3 text-sm text-neutral-400">
            Members submitted these from TMDB. Approve to add them to the catalog, or reject to
            permanently remove them.
          </p>
          <AdminPendingMovies initialMovies={serializedPending} />
        </section>
      )}

      <h2 className="mb-2 text-lg font-semibold text-white">Catalog</h2>
      <p className="mb-6 text-sm text-neutral-400">
        Deleting a movie permanently removes it and everything attached to it &mdash; ratings,
        discussion posts, and fight scenes included. This can&rsquo;t be undone.
      </p>
      <AdminMovieList initialMovies={serializedMovies} />
    </div>
  );
}
