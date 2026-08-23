"use client";

import { useState } from "react";

// Same clamp-with-toggle pattern as RecentReviewsFeed/ReviewsSection (see
// CLAMP_THRESHOLD there) -- scaled for this column, which is narrower than
// the page's old full-width bio paragraph now that Career Highlights sits
// beside it, but wider than a review card.
const CLAMP_THRESHOLD = 280;

export function ActorBio({ biography }: { biography: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = biography.length > CLAMP_THRESHOLD;

  return (
    <div>
      <p className={`whitespace-pre-line text-sm text-neutral-300 ${!expanded && isLong ? "line-clamp-4" : ""}`}>
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
