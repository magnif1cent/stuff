import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { isEraSettingKey, eraSettingName, eraSettingYears } from "@/lib/era-settings";
import { getRatingSummaries } from "@/lib/ratings";
import { MovieCard } from "@/components/movie-card";

const PAGE_SIZE = 24;

interface EraPageSearchParams {
  page?: string;
}

function pageHref(era: string, page: number) {
  return page > 1 ? `/timeline/${era}?page=${page}` : `/timeline/${era}`;
}

export async function generateMetadata({ params }: { params: Promise<{ era: string }> }): Promise<Metadata> {
  const { era } = await params;
  if (!isEraSettingKey(era)) return {};
  const name = eraSettingName(era);
  return { title: name ? `${name} — Historical Timeline` : "Historical Timeline" };
}

export default async function TimelineEraPage({
  params,
  searchParams,
}: {
  params: Promise<{ era: string }>;
  searchParams: Promise<EraPageSearchParams>;
}) {
  const { era } = await params;
  const sp = await searchParams;
  if (!isEraSettingKey(era)) {
    notFound();
  }

  const movies = await prisma.movie.findMany({
    where: { eraSetting: era, status: "APPROVED" },
    orderBy: { releaseDate: "asc" },
  });
  if (movies.length === 0) {
    notFound();
  }

  const totalPages = Math.max(1, Math.ceil(movies.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, Number(sp.page) || 1), totalPages);
  const pagedMovies = movies.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const ratingSummaries = await getRatingSummaries(pagedMovies.map((m) => m.id));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <p className="mb-1 text-sm text-neutral-400">
        <Link href="/timeline" className="hover:text-white">
          ← Back to Timeline
        </Link>
      </p>
      <div className="mb-2 flex flex-wrap items-baseline gap-2">
        <h1 className="font-serif text-2xl font-bold text-white">{eraSettingName(era)}</h1>
        {eraSettingYears(era) && <span className="text-sm text-neutral-500">{eraSettingYears(era)}</span>}
      </div>
      <p className="mb-8 text-sm text-neutral-400">
        {movies.length} {movies.length === 1 ? "movie" : "movies"} set in this era
      </p>

      <div className="flex flex-wrap gap-4">
        {pagedMovies.map((movie) => {
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

      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-4 text-sm">
          {page > 1 ? (
            <Link href={pageHref(era, page - 1)} className="text-red-500 hover:underline">
              ← Previous
            </Link>
          ) : (
            <span className="text-neutral-600">← Previous</span>
          )}
          <span className="text-neutral-400">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link href={pageHref(era, page + 1)} className="text-red-500 hover:underline">
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
