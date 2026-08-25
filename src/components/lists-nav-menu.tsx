"use client";

import { useState } from "react";
import Link from "next/link";

// A small chevron next to the "Lists" nav link reveals Leaderboard --
// click-to-toggle, not hover, so it works identically on touch and
// desktop (a hover-only menu is unreachable on mobile, where there's no
// hover state at all). "Lists" itself stays a plain, unchanged link;
// the chevron is a separate control so neither behavior is ambiguous.
// Same dropdown pattern (and lack of click-outside-to-close) as
// ShareButton, src/components/share-button.tsx.
export function ListsNavMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative flex items-center">
      <Link href="/lists" className="text-sm whitespace-nowrap text-neutral-300 hover:text-white">
        Lists
      </Link>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="More list options"
        aria-expanded={open}
        className="flex h-5 w-5 items-center justify-center text-neutral-500 hover:text-white"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-3 w-3"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 z-30 mt-1.5 min-w-36 rounded-md border border-neutral-700 bg-neutral-800 p-1 shadow-xl">
          <Link
            href="/leaderboard"
            onClick={() => setOpen(false)}
            className="block rounded px-3 py-1.5 text-sm whitespace-nowrap text-neutral-100 hover:bg-neutral-700"
          >
            Leaderboard
          </Link>
        </div>
      )}
    </div>
  );
}
