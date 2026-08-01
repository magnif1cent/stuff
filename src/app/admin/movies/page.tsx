import { prisma } from "@/lib/prisma";
import { AdminMovieList } from "@/components/admin-movie-list";

export default async function AdminMoviesPage() {
  const movies = await prisma.movie.findMany({
    orderBy: { title: "asc" },
    select: {
      id: true,
      title: true,
      releaseDate: true,
      _count: { select: { ratings: true, discussionPosts: true, fightScenes: true } },
    },
  });

  const serializedMovies = movies.map((movie) => ({
    ...movie,
    releaseDate: movie.releaseDate?.toISOString() ?? null,
  }));

  return (
    <div className="max-w-3xl">
      <h1 className="mb-2 text-2xl font-bold text-white">Movies</h1>
      <p className="mb-6 text-sm text-neutral-400">
        Deleting a movie permanently removes it and everything attached to it &mdash; ratings,
        discussion posts, and fight scenes included. This can&rsquo;t be undone.
      </p>
      <AdminMovieList initialMovies={serializedMovies} />
    </div>
  );
}
