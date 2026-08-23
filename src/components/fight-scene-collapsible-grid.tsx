"use client";

import { useState } from "react";
import { FightSceneResultCard, type FightSceneResult } from "@/components/fight-scene-result-card";
import type { AddToListItem } from "@/components/add-to-list-control";
import { SignatureVoteButton } from "@/components/actor-signature-vote";

// How many scenes show before "Show all N" -- same reasoning as the
// Filmography list: some actors have far more tagged fight scenes than
// comfortably fit on screen at once.
const COLLAPSE_COUNT = 6;

export interface FightSceneEntry {
  scene: FightSceneResult;
  initialLists: AddToListItem[];
  signedIn: boolean;
  initialFavorite: boolean;
}

export function FightSceneCollapsibleGrid({ entries }: { entries: FightSceneEntry[] }) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);

  const q = query.trim().toLowerCase();
  const filtered = q ? entries.filter((e) => e.scene.title.toLowerCase().includes(q)) : entries;
  // Filtering already narrows the list to what you're looking for, so it
  // takes over from the collapse cap rather than stacking with it.
  const visible = q || expanded ? filtered : filtered.slice(0, COLLAPSE_COUNT);
  const showToggle = !q && entries.length > COLLAPSE_COUNT;

  return (
    <div>
      <div className="relative mb-4 max-w-xs">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter fight scenes by title…"
          className="w-full rounded-md border border-neutral-700 bg-neutral-900 py-2 pr-3 pl-8 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-red-600 focus:outline-none"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-neutral-400">No fight scenes match that title.</p>
      ) : (
        <div className="flex flex-wrap gap-4">
          {visible.map(({ scene, initialLists, signedIn, initialFavorite }) => (
            <div key={scene.id} className="relative">
              <FightSceneResultCard
                scene={scene}
                initialLists={initialLists}
                signedIn={signedIn}
                initialFavorite={initialFavorite}
              />
              <div className="absolute top-3 right-3">
                <SignatureVoteButton kind="fightScene" id={scene.id} />
              </div>
            </div>
          ))}
        </div>
      )}

      {showToggle && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-4 w-full rounded-md border border-dashed border-neutral-700 py-2 text-sm text-neutral-400 hover:border-red-600 hover:text-red-500"
        >
          {expanded ? "Show fewer fight scenes ↑" : `Show all ${entries.length} fight scenes →`}
        </button>
      )}
    </div>
  );
}
