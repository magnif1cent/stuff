"use client";

import { useState } from "react";

// Lighter-weight than ProfileTabs (see DECISIONS.md) -- sized for a compact
// mobile card, not a page-level section. Tab labels double as the section
// headers, so neither tab's content repeats a "Details"/"Collection"
// heading of its own. Only rendered when both sections actually exist --
// with just one, the caller renders that content directly instead, no
// tab bar with nothing to switch between.
export function MovieDetailsTabs({
  basicDetailsRows,
  collectionContent,
}: {
  basicDetailsRows: React.ReactNode;
  collectionContent: React.ReactNode;
}) {
  const [tab, setTab] = useState<"details" | "collection">("details");

  return (
    <div>
      <div className="mb-2 flex gap-3 border-b border-neutral-800">
        {(
          [
            ["details", "Details"],
            ["collection", "Collection"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`font-cond -mb-px border-b-2 pb-1.5 text-xs tracking-widest uppercase ${
              tab === key ? "border-red-600 text-neutral-200" : "border-transparent text-neutral-500"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "details" ? (
        <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1.5">{basicDetailsRows}</dl>
      ) : (
        collectionContent
      )}
    </div>
  );
}
