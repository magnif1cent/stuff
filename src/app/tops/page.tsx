import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Tops",
  description: "The catalog's highest community-rated movies and fight scenes.",
};

// Movies and fight scenes get their own pages (/tops/movies, /tops/fights)
// rather than two sections on one page — a fight scene's ticket card and a
// movie's poster card don't share a grid layout, so splitting them avoids a
// page that's really two unrelated grids stacked under one URL. This index
// is just the landing spot the footer's "Tops" link points at.
export default function TopsIndexPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16 text-center">
      <p className="mb-2 font-cond text-xs font-semibold tracking-widest text-red-500 uppercase">
        Community rankings
      </p>
      <h1 className="mb-8 font-display text-4xl font-normal tracking-wide text-white">Tops</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/tops/movies"
          className="rounded-lg border border-neutral-800 bg-neutral-900 p-8 transition hover:border-red-800"
        >
          <p className="font-display text-2xl font-normal tracking-wide text-white">Top 100 Movies</p>
          <p className="mt-2 text-sm text-neutral-400">The catalog&apos;s highest-rated films.</p>
        </Link>
        <Link
          href="/tops/fights"
          className="rounded-lg border border-neutral-800 bg-neutral-900 p-8 transition hover:border-red-800"
        >
          <p className="font-display text-2xl font-normal tracking-wide text-white">Top 100 Fights</p>
          <p className="mt-2 text-sm text-neutral-400">The catalog&apos;s highest-rated scenes.</p>
        </Link>
      </div>
    </div>
  );
}
