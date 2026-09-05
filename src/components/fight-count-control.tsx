"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export interface FightCountEditEntry {
  id: string;
  previousValue: number | null;
  newValue: number;
  createdAt: string;
  editedBy: { username: string };
}

const MAX_FIGHT_COUNT = 20;

export function FightCountControl({
  movieId,
  initialCount,
  recentEdits,
  editing,
}: {
  movieId: string;
  initialCount: number | null;
  recentEdits: FightCountEditEntry[];
  // Controlled by a shared "Edit" toggle one level up (see MovieDataSection)
  // rather than owned locally, so one button can put both Fight Count and
  // Historical Setting into edit mode together.
  editing: boolean;
}) {
  const [count, setCount] = useState(initialCount);
  const [inputValue, setInputValue] = useState(initialCount != null ? String(initialCount) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const router = useRouter();

  // Reset the draft input from the current (already-saved) `count` whenever
  // edit mode opens, without an effect -- React's documented pattern for
  // "adjust state when a prop changes": compare against the previous value
  // during render and setState conditionally, rather than after commit.
  // Deriving from `count` (this component's own local state) rather than
  // `initialCount` (the server-rendered prop) matters here: `count` is
  // already correct the instant handleSave resolves, while `initialCount`
  // only catches up once router.refresh()'s background re-fetch lands --
  // keying a remount to `editing` instead of this would occasionally reset
  // a just-saved value back to stale data if "Done" was clicked quickly.
  const [prevEditing, setPrevEditing] = useState(editing);
  if (editing !== prevEditing) {
    setPrevEditing(editing);
    if (editing) {
      setInputValue(count != null ? String(count) : "");
      setError(null);
    }
  }

  async function handleSave() {
    const parsed = Number(inputValue);
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > MAX_FIGHT_COUNT) {
      setError(`Enter a whole number between 0 and ${MAX_FIGHT_COUNT}.`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/movies/${movieId}/fight-count`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: parsed }),
      });
      if (res.ok) {
        setCount(parsed);
        router.refresh();
      } else {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Something went wrong.");
      }
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div id="fight-count" className="mb-4 scroll-mt-20 text-sm text-neutral-400">
      <span>
        Fight Count: <span className="font-medium text-neutral-200">{count ?? "—"}</span>
      </span>

      {editing && (
        <div className="mt-1 flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={MAX_FIGHT_COUNT}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={saving}
            className="w-20 rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-base text-neutral-100 focus:border-red-600 focus:outline-none"
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-red-700 px-2 py-1 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      )}

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}

      {/* Any signed-in member can overwrite the value with no consensus
          step, so this history is the only accountability trail — surfaced
          to everyone (not just admins) since anyone might be the one to
          notice and revert a bad edit. */}
      {recentEdits.length > 0 && (
        <div className="mt-1">
          <button
            onClick={() => setShowHistory((prev) => !prev)}
            className="text-xs text-neutral-500 underline hover:text-neutral-300"
          >
            {showHistory ? "Hide history" : `History (${recentEdits.length})`}
          </button>
          {showHistory && (
            <ul className="mt-1 flex flex-col gap-0.5 text-xs text-neutral-500">
              {recentEdits.map((edit) => (
                <li key={edit.id}>
                  {edit.editedBy.username} changed {edit.previousValue ?? "—"} &rarr; {edit.newValue} on{" "}
                  {new Date(edit.createdAt).toLocaleDateString()}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
