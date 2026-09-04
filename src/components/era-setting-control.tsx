"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ERA_SETTINGS, eraSettingLabel } from "@/lib/era-settings";

export interface EraSettingEditEntry {
  id: string;
  previousValue: string | null;
  newValue: string;
  createdAt: string;
  editedBy: { username: string };
}

export function EraSettingControl({
  movieId,
  initialEra,
  recentEdits,
  signedIn,
}: {
  movieId: string;
  initialEra: string | null;
  recentEdits: EraSettingEditEntry[];
  signedIn: boolean;
}) {
  const [era, setEra] = useState(initialEra);
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState(initialEra ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const router = useRouter();

  async function handleSave() {
    if (!selected) {
      setError("Pick an era from the list.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/movies/${movieId}/era-setting`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ era: selected }),
      });
      if (res.ok) {
        setEra(selected);
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
    <div id="era-setting" className="mb-4 scroll-mt-20 text-sm text-neutral-400">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span>
          Era: <span className="font-medium text-neutral-200">{eraSettingLabel(era) ?? "—"}</span>
        </span>
        {signedIn ? (
          !editing && (
            <button
              onClick={() => {
                setSelected(era ?? "");
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
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            disabled={saving}
            className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
          >
            <option value="" disabled>
              Select an era…
            </option>
            {ERA_SETTINGS.map((e) => (
              <option key={e.key} value={e.key}>
                {e.label}
              </option>
            ))}
          </select>
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
          notice and revert a bad edit. Same reasoning as Fight Count. */}
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
                  {edit.editedBy.username} changed {eraSettingLabel(edit.previousValue) ?? "—"} &rarr;{" "}
                  {eraSettingLabel(edit.newValue) ?? edit.newValue} on{" "}
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
