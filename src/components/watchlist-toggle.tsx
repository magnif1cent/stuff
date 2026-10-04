"use client";

import { useState } from "react";

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-4 w-4">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

// One-tap Watchlist toggle for a movie card, signed-in members only (callers
// don't render it otherwise). A clock, not a bookmark: on fight cards the
// bookmark means "save to a custom list", and this deliberately doesn't
// open that menu -- custom lists and Favorites stay on the movie page.
// Same endpoint and blue "on Watchlist" color as the movie page's
// ListButtons.
export function WatchlistToggle({ movieId, initialOn }: { movieId: string; initialOn: boolean }) {
  const [on, setOn] = useState(initialOn);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setPending(true);
    setError(null);
    const res = await fetch(`/api/movies/${movieId}/list`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listType: "WATCHLIST" }),
    });
    setPending(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong.");
      return;
    }
    const { active } = await res.json();
    setOn(active);
  }

  const label = on ? "On your Watchlist (tap to remove)" : "Add to Watchlist";
  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        title={label}
        aria-label={label}
        aria-pressed={on}
        className={`flex h-8 w-8 items-center justify-center rounded-full transition disabled:opacity-50 ${
          on ? "bg-blue-700 text-white hover:bg-blue-600" : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
        }`}
      >
        <ClockIcon />
      </button>
      {error && (
        <p className="absolute right-0 top-full z-10 mt-1 w-40 rounded bg-neutral-950/95 p-1 text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}
