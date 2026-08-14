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

const MAX_FIGHT_COUNT = 100;

export function FightCountControl({
  movieId,
  initialCount,
  recentEdits,
  signedIn,
}: {
  movieId: string;
  initialCount: number | null;
  recentEdits: FightCountEditEntry[];
  signedIn: boolean;
}) {
  const [count, setCount] = useState(initialCount);
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(initialCount != null ? String(initialCount) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const router = useRouter();

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
        setEditing(false);
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
    <div className="mb-4 text-sm text-neutral-400">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span>
          Fight Count: <span className="font-medium text-neutral-200">{count ?? "—"}</span>
        </span>
        {signedIn ? (
          !editing && (
            <button
              onClick={() => {
                setInputValue(count != null ? String(count) : "");
                setError(null);
                setEditing(true);
              }}
              className="text-xs text-neutral-500 underline hover:text-neutral-300"
            >
              Edit
            </button>
          )
        ) : (
          <a href="/login" className="text-xs text-red-500 hover:underline">
            Sign in to edit
          </a>
        )}
      </div>

      {editing && (
        <div className="mt-1 flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={MAX_FIGHT_COUNT}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={saving}
            className="w-20 rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-red-700 px-2 py-1 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            onClick={() => {
              setEditing(false);
              setError(null);
            }}
            disabled={saving}
            className="text-xs text-neutral-500 hover:text-neutral-300"
          >
            Cancel
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
