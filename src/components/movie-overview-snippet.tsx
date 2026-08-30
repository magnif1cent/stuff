"use client";

import { useState } from "react";

// Rough character count above which line-clamp-7 at this component's size
// (text-xs, ~200px column) actually truncates -- same heuristic
// MemberReviewCard uses (a character threshold, not a measured line count)
// to decide whether "Show more" is worth showing at all.
const CLAMP_THRESHOLD = 260;

export function MovieOverviewSnippet({ overview }: { overview: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = overview.length > CLAMP_THRESHOLD;

  // The root element is the flex item the parent row stretches to the
  // poster's height (align-items: stretch). overflow-hidden lives here,
  // not on a nested div, and covers the button too -- not just the
  // paragraph -- so collapsed never exceeds the poster's height at all,
  // button included. line-clamp-7 (one fewer than the space could
  // technically fit) deliberately leaves room within that same budget for
  // the button to sit below the text without needing to spill past it.
  return (
    <div className={`min-w-0 flex-1 sm:hidden ${expanded ? "" : "overflow-hidden"}`}>
      <p className={`font-editorial text-xs text-neutral-400 ${!expanded && isLong ? "line-clamp-7" : ""}`}>
        {overview}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="mt-1 text-xs font-medium text-red-500 hover:underline"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}
