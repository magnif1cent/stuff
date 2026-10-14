"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Admin-only, inline on the actor page (same pattern as the other admin
// actions that live on regular pages): feature this actor in the homepage's
// Actor Spotlight, edit the one-line blurb, or take the spotlight down.
export function ActorSpotlightControl({
  personId,
  isCurrent,
  currentBlurb,
  maxLength,
}: {
  personId: string;
  isCurrent: boolean;
  currentBlurb: string | null;
  maxLength: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [blurb, setBlurb] = useState(currentBlurb ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(method: "POST" | "DELETE") {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/admin/actor-spotlight", {
      method,
      headers: { "Content-Type": "application/json" },
      body: method === "POST" ? JSON.stringify({ personId, blurb }) : undefined,
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong.");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="mb-6 rounded-md border border-amber-800 bg-amber-950/40 p-3 text-sm">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-semibold text-amber-500">Homepage spotlight</span>
        <span className="text-neutral-400">
          {isCurrent ? "This actor is this week's Actor Spotlight." : "Not featured."}
        </span>
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-md border border-neutral-700 px-2.5 py-1 text-neutral-300 hover:border-neutral-500 hover:text-white"
          >
            {isCurrent ? "Edit blurb" : "Feature on homepage"}
          </button>
        )}
        {isCurrent && !open && (
          <button
            type="button"
            onClick={() => send("DELETE")}
            disabled={saving}
            className="text-neutral-400 hover:text-red-400 disabled:opacity-50"
          >
            Remove from homepage
          </button>
        )}
      </div>

      {open && (
        <div className="mt-3 flex flex-col gap-2">
          <label htmlFor="spotlight-blurb" className="text-neutral-400">
            One-line blurb (optional), shown under the name
          </label>
          <input
            id="spotlight-blurb"
            value={blurb}
            onChange={(e) => setBlurb(e.target.value)}
            maxLength={maxLength}
            placeholder="e.g. Hong Kong actor, stuntman and director · born 1954"
            className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100 placeholder:text-neutral-600"
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => send("POST")}
              disabled={saving}
              className="rounded-md bg-red-600 px-3 py-1.5 font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isCurrent ? "Save blurb" : "Feature this week"}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="text-neutral-400 hover:text-white">
              Cancel
            </button>
            <span className="ml-auto text-xs text-neutral-500">
              {blurb.length}/{maxLength}
            </span>
          </div>
          {!isCurrent && (
            <p className="text-xs text-neutral-500">Replaces whichever actor is featured now.</p>
          )}
        </div>
      )}
      {error && <p className="mt-2 text-red-400">{error}</p>}
    </div>
  );
}
