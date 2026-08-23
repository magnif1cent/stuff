"use client";

import { useState } from "react";

// Same clamp-with-toggle pattern as RecentReviewsFeed/ReviewsSection (see
// CLAMP_THRESHOLD there), but clamped to 10 lines instead of those two's
// 3/4 -- a bio reads more like an article than a review, so it gets more
// room before the toggle kicks in. Threshold scaled up to match (roughly
// proportional to the wider line-clamp). line-clamp-[10] is an arbitrary
// value: Tailwind's line-clamp utility only ships 1-6 by default, so a
// bare "line-clamp-10" class wouldn't generate any CSS.
const CLAMP_THRESHOLD = 700;

export function ActorBio({ biography }: { biography: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = biography.length > CLAMP_THRESHOLD;

  return (
    <div>
      <p className={`whitespace-pre-line text-sm text-neutral-300 ${!expanded && isLong ? "line-clamp-[10]" : ""}`}>
        {biography}
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
