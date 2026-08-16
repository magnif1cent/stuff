"use client";

import { useState, type ReactNode } from "react";

// A lighter-weight toggle than ProfileTabs (pill buttons, not full-width
// underlined tabs) — this is sub-navigation *within* a single profile tab
// ("Lists"), not another layer of top-level tabs, so it's deliberately
// styled to read as one level down rather than a second identical tab bar.
export function ListsPanel({
  mineLabel,
  mineContent,
  likedLabel,
  likedContent,
}: {
  mineLabel: string;
  mineContent: ReactNode;
  likedLabel: string;
  likedContent: ReactNode;
}) {
  const [active, setActive] = useState<"mine" | "liked">("mine");

  return (
    <div>
      <div className="mb-6 flex gap-2">
        {(
          [
            ["mine", mineLabel],
            ["liked", likedLabel],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setActive(key)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              active === key ? "bg-red-700 text-white" : "bg-neutral-900 text-neutral-400 hover:text-neutral-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {active === "mine" ? mineContent : likedContent}
    </div>
  );
}
