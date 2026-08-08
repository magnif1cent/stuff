"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { resolvePosterUrl } from "@/lib/tmdb";

// Tailwind's class scanner needs the full class name literally in source
// (not built from a template string) to generate its CSS, so this isn't a
// configurable constant — see the literal "line-clamp-3" below if it needs
// to change.
// Below this length a review reads fine in full without needing a toggle —
// clamping short reviews would just add a pointless "Read more" click.
// Scaled down from the feed's earlier full-width layout: narrower cards
// wrap sooner, so the same character count now spans more lines.
const CLAMP_THRESHOLD = 220;

export interface RecentReviewItem {
  id: string;
  content: string;
  updatedAt: string;
  movie: {
    id: string;
    title: string;
    releaseDate: string | null;
    posterPath: string | null;
    posterOverrideUrl: string | null;
  };
  author: { username: string };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function ReviewText({ content }: { content: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = content.length > CLAMP_THRESHOLD;

  return (
    <div>
      <p className={`whitespace-pre-wrap text-sm text-neutral-300 ${!expanded && isLong ? "line-clamp-3" : ""}`}>
        {content}
      </p>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-1 text-xs font-medium text-red-500 hover:underline"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}

export function RecentReviewsFeed({ reviews }: { reviews: RecentReviewItem[] }) {
  if (reviews.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8">
      <h2 className="mb-4 font-serif text-xl font-bold text-white">Recent Editor&rsquo;s Reviews</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {reviews.map((review) => {
          const posterUrl = resolvePosterUrl(review.movie, "w200");
          const year = review.movie.releaseDate ? new Date(review.movie.releaseDate).getFullYear() : null;

          return (
            <article
              key={review.id}
              className="rounded-md border border-neutral-800 bg-neutral-900 p-4"
            >
              <div className="mb-2 flex items-center gap-2.5">
                <Link href={`/movies/${review.movie.id}`} className="shrink-0">
                  <div className="relative aspect-2/3 w-10 overflow-hidden rounded bg-neutral-800">
                    {posterUrl ? (
                      <Image src={posterUrl} alt={review.movie.title} fill sizes="40px" className="object-cover" />
                    ) : null}
                  </div>
                </Link>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-1.5">
                    <Link
                      href={`/movies/${review.movie.id}`}
                      className="truncate font-serif text-base font-bold text-white hover:text-red-400"
                    >
                      {review.movie.title}
                    </Link>
                    {year && <span className="text-xs text-neutral-500">({year})</span>}
                  </div>
                  <p className="text-xs text-neutral-500">
                    Reviewed by {review.author.username} · {formatDate(review.updatedAt)}
                  </p>
                </div>
              </div>
              <ReviewText content={review.content} />
            </article>
          );
        })}
      </div>
    </section>
  );
}
