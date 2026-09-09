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
    <div>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="font-serif text-xl font-bold text-white">Movie Data</h2>
        {signedIn ? (
          <button
            onClick={() => setEditing((prev) => !prev)}
            className="rounded-md border border-neutral-700 px-3 py-1 text-xs text-neutral-300 hover:bg-neutral-800"
          >
            {editing ? "Done" : "Edit"}
          </button>
        ) : (
          <a href="/login" className="text-xs text-red-500 hover:underline">
            Sign in to edit
          </a>
        )}
      </div>

      {/* Header sits outside the box, flush with Cast/Reviews/Fights/Fun
          Facts's headers -- matches their pattern of boxing only the
          content (review cards, fight cards), not the section header. */}
      <div className="rounded-md border border-neutral-800 p-3">
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
    </div>
  );
}
