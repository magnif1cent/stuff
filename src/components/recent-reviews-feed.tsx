"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { resolvePosterUrl } from "@/lib/tmdb";

// Below this length a review reads fine in full without needing a toggle —
// clamping short reviews would just add a pointless "Read more" click.
const CLAMP_THRESHOLD = 400;

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
      <p className={`whitespace-pre-wrap text-sm text-neutral-300 ${!expanded && isLong ? "line-clamp-4" : ""}`}>
        {content}
      </p>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-1 text-xs font-medium text-red-500 hover:underline"
        >
          {expanded ? "Show less" : "Read full review"}
        </button>
      )}
    </div>
  );
}

export function RecentReviewsFeed({ reviews }: { reviews: RecentReviewItem[] }) {
  if (reviews.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8">
      <h2 className="mb-4 font-serif text-xl font-bold text-white">Recently Reviewed</h2>
      <div className="flex flex-col gap-4">
        {reviews.map((review) => {
          const posterUrl = resolvePosterUrl(review.movie, "w200");
          const year = review.movie.releaseDate ? new Date(review.movie.releaseDate).getFullYear() : null;

          return (
            <article
              key={review.id}
              className="flex gap-4 rounded-md border border-neutral-800 bg-neutral-900 p-4"
            >
              <Link href={`/movies/${review.movie.id}`} className="shrink-0">
                <div className="relative aspect-2/3 w-16 overflow-hidden rounded bg-neutral-800 sm:w-20">
                  {posterUrl ? (
                    <Image src={posterUrl} alt={review.movie.title} fill sizes="80px" className="object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center px-1 text-center text-[10px] text-neutral-500">
                      {review.movie.title}
                    </div>
                  )}
                </div>
              </Link>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <Link
                    href={`/movies/${review.movie.id}`}
                    className="font-serif text-base font-bold text-white hover:text-red-400"
                  >
                    {review.movie.title}
                  </Link>
                  {year && <span className="text-xs text-neutral-500">({year})</span>}
                </div>
                <p className="mb-2 text-xs text-neutral-500">
                  Reviewed by {review.author.username} · {formatDate(review.updatedAt)}
                </p>
                <ReviewText content={review.content} />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
