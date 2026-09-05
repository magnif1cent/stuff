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
    <div className="rounded-md border border-neutral-800 p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="font-cond text-xs tracking-wider text-neutral-500 uppercase">Movie Data</p>
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

      {/* A row of attribute cells rather than a single narrow stacked
          card -- as more member-maintained attributes get added here
          beyond Fight Count and Historical Setting, each one is just
          another cell appended to this row instead of the box growing
          taller (which previously fought for vertical space against
          Your Rating/Details in the two-column hero -- see
          DECISIONS.md). */}
      <div className="flex flex-wrap gap-x-10 gap-y-4">
        <FightCountControl
          movieId={movieId}
          initialCount={initialCount}
          recentEdits={fightCountEdits}
          editing={editing}
        />

        <EraSettingControl
          movieId={movieId}
          initialEra={initialEra}
          recentEdits={eraSettingEdits}
          editing={editing}
        />
      </div>
    </div>
  );
}
