"use client";

import { useState } from "react";
import { FightCountControl, type FightCountEditEntry } from "@/components/fight-count-control";
import { EraSettingControl, type EraSettingEditEntry } from "@/components/era-setting-control";

// One shared "Edit" toggle for both Fight Count and Historical Setting,
// instead of each field owning its own -- clicking it puts both into edit
// mode together; each still saves independently (they hit different API
// routes), so there's no combined submit.
export function MovieDataSection({
  movieId,
  initialCount,
  fightCountEdits,
  initialEra,
  eraSettingEdits,
  signedIn,
}: {
  movieId: string;
  initialCount: number | null;
  fightCountEdits: FightCountEditEntry[];
  initialEra: string | null;
  eraSettingEdits: EraSettingEditEntry[];
  signedIn: boolean;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="mt-6 max-w-sm rounded-md border border-neutral-800 p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-serif text-xl font-bold text-white">Movie Data</h3>
        {signedIn ? (
          <button
            onClick={() => setEditing((prev) => !prev)}
            className="text-xs text-neutral-500 underline hover:text-neutral-300"
          >
            {editing ? "Done" : "Edit"}
          </button>
        ) : (
          <a href="/login" className="text-xs text-red-500 hover:underline">
            Sign in to edit
          </a>
        )}
      </div>

      {/* Keyed on `editing` so each control's local draft state (the
          number input, the era select) re-initializes fresh from current
          props whenever edit mode opens or closes, instead of an effect
          syncing state on top of state. */}
      <FightCountControl
        key={`fight-count-${editing}`}
        movieId={movieId}
        initialCount={initialCount}
        recentEdits={fightCountEdits}
        editing={editing}
      />

      <div className="my-4 border-t border-neutral-800" />

      <EraSettingControl
        key={`era-setting-${editing}`}
        movieId={movieId}
        initialEra={initialEra}
        recentEdits={eraSettingEdits}
        editing={editing}
      />
    </div>
  );
}
