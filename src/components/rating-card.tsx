"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RATING_CATEGORIES, type RatingCategoryKey } from "@/lib/rating-categories";
import { MAX_ADMIN_NOTE_LENGTH } from "@/lib/admin-rating";
import { StarRatingPicker } from "@/components/star-rating-picker";

// How long to wait after the last keystroke before persisting the editor's
// note -- long enough not to fire on every character, short enough that a
// tab switch or navigation right after typing rarely beats it (onBlur below
// also flushes immediately, as a backstop for that case).
const NOTE_AUTOSAVE_DELAY_MS = 900;

export function RatingCard({
  movieId,
  signedIn,
  initialScore,
  initialCategoryScores,
  isAdmin,
  initialAdminScore = null,
  initialAdminNote = null,
  initialAdminCategoryScores,
}: {
  movieId: string;
  signedIn: boolean;
  initialScore: number | null;
  initialCategoryScores?: Partial<Record<RatingCategoryKey, number>>;
  isAdmin: boolean;
  initialAdminScore?: number | null;
  initialAdminNote?: string | null;
  initialAdminCategoryScores?: Partial<Record<RatingCategoryKey, number>>;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"member" | "admin">("member");

  const [score, setScore] = useState(initialScore);
  const [categoryScores, setCategoryScores] = useState(initialCategoryScores ?? {});
  const [saving, setSaving] = useState(false);
  const [savingCategory, setSavingCategory] = useState<RatingCategoryKey | null>(null);

  const [adminScore, setAdminScore] = useState(initialAdminScore);
  const [adminNote, setAdminNote] = useState(initialAdminNote ?? "");
  const [adminCategoryScores, setAdminCategoryScores] = useState(initialAdminCategoryScores ?? {});
  const [adminSaving, setAdminSaving] = useState(false);
  const [savingAdminCategory, setSavingAdminCategory] = useState<RatingCategoryKey | null>(null);
  const [noteStatus, setNoteStatus] = useState<"idle" | "saving" | "saved">("idle");

  // Kept separate rather than one shared `error` -- an admin-tab request
  // that fails after the user has already switched back to the member tab
  // (or vice versa) shouldn't surface as an error on the tab now showing.
  const [memberError, setMemberError] = useState<string | null>(null);
  const [adminError, setAdminError] = useState<string | null>(null);

  // Keeps the debounced save closure below reading the latest admin score
  // (and the unmount-flush effect reading the latest note) without
  // re-running effect/timer setup on every keystroke.
  const latestAdminScore = useRef(adminScore);
  const latestAdminNote = useRef(adminNote);
  // The last score a save actually confirmed -- unlike latestAdminScore
  // (which is bumped optimistically on every click, including ones still
  // waiting to hear back), this only ever changes on a successful save. A
  // failed save rolls latestAdminScore back to *this*, not to whatever the
  // previous click happened to optimistically guess -- two failed clicks in
  // a row would otherwise roll back to the first click's own unconfirmed
  // value instead of the real last-known-good score.
  const confirmedAdminScore = useRef(adminScore);
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // True from the moment the note differs from what's confirmed saved,
  // until a save actually succeeds -- deliberately not "is a timer
  // pending," since a *failed* flush clears the timer while the edit is
  // still unsaved, which would otherwise stop onBlur/unmount from ever
  // retrying it.
  const noteDirty = useRef(false);
  // Chains every admin-rating POST (score saves and note-autosave flushes
  // alike) onto the one before it, so a slow request can't resolve after a
  // later one and overwrite it with stale data -- the API upserts the whole
  // row, so out-of-order writes would otherwise silently lose whichever
  // field changed in the request that finished first. Because of this,
  // request *completion* order always matches call order, so each call's
  // own continuation can safely apply its own result to UI state as soon as
  // it resolves -- the worst case is a brief flicker of an older value if a
  // newer call is still in flight, corrected the moment that one resolves
  // too. An earlier version tried to suppress even that flicker with a
  // sequence-number "is this still the latest call" gate; it was removed
  // after several rounds of review turned up real bugs it introduced
  // (state that never got corrected once "superseded", stale-closure note
  // values, a permanently stuck saving flag) -- worse than the flicker it
  // was solving.
  const adminRatingChain = useRef<Promise<boolean>>(Promise.resolve(true));

  useEffect(() => {
    latestAdminScore.current = adminScore;
  }, [adminScore]);

  useEffect(() => {
    latestAdminNote.current = adminNote;
  }, [adminNote]);

  useEffect(() => {
    return () => {
      if (noteTimer.current) clearTimeout(noteTimer.current);
      if (!noteDirty.current || latestAdminScore.current === null) return;
      // Unmounting (e.g. a client-side navigation) with an edit still
      // sitting in the debounce window -- fire the save directly rather
      // than going through flushNote, which would call setState on a
      // component that's no longer mounted. Reuses postRating (keepalive
      // included) so this doesn't hand-roll a second copy of the same
      // fetch/error handling; still chained onto adminRatingChain so it
      // can't race ahead of a save already in flight.
      adminRatingChain.current = adminRatingChain.current.then(() =>
        postRating(
          `/api/movies/${movieId}/admin-rating`,
          { score: latestAdminScore.current, note: latestAdminNote.current },
          { refresh: false },
        ).then((result) => result.ok),
      );
    };
    // Runs its cleanup only on unmount (empty deps) and reads current
    // values via refs, not closed-over state, intentionally. postRating is
    // a stable function declaration (hoisted), safe to call from a cleanup
    // that only actually runs well after the component's first render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!signedIn) {
    return (
      <a href="/login" className="text-sm text-red-500 hover:underline">
        Sign in to rate this movie
      </a>
    );
  }

  // Shared by every rating POST in this card (overall + category, member +
  // admin) -- they all differ only in URL, payload, and whether the rest of
  // the (server-rendered) page needs to reflect the change. A pure note edit
  // isn't shown anywhere outside this card, so it skips the refresh a score
  // change needs for the Community/Editors' Score readout above. Returns the
  // outcome rather than setting error state itself, since the admin path
  // below needs to decide *whether* a failure is still worth surfacing
  // before showing it.
  async function postRating(
    url: string,
    body: unknown,
    { refresh = true } = {},
  ): Promise<{ ok: boolean; error: string | null }> {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        // Asks the browser to still deliver this request if the page is
        // navigated away from or closed mid-flight, same as the dedicated
        // unmount-flush below -- covers a save that was already in flight
        // when that happens, not just the one the unmount effect itself
        // fires.
        keepalive: true,
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        return { ok: false, error: errBody.error ?? "Something went wrong." };
      }
      if (refresh) router.refresh();
      return { ok: true, error: null };
    } catch {
      return { ok: false, error: "Couldn't reach the server. Check your connection and try again." };
    }
  }

  async function handleRate(value: number) {
    setSaving(true);
    setMemberError(null);
    const { ok, error } = await postRating(`/api/movies/${movieId}/rating`, { score: value });
    if (ok) setScore(value);
    else setMemberError(error);
    setSaving(false);
  }

  async function handleRateCategory(category: RatingCategoryKey, value: number) {
    setSavingCategory(category);
    setMemberError(null);
    const { ok, error } = await postRating(`/api/movies/${movieId}/rating/category`, { category, score: value });
    if (ok) setCategoryScores((prev) => ({ ...prev, [category]: value }));
    else setMemberError(error);
    setSavingCategory(null);
  }

  // Queues an admin-rating POST behind whichever one is already in flight,
  // so score saves and note-autosave flushes can never land out of order
  // against each other (see adminRatingChain above).
  function saveAdminRating(nextScore: number, nextNote: string, opts: { refresh?: boolean } = {}) {
    const run = adminRatingChain.current.then(() =>
      postRating(`/api/movies/${movieId}/admin-rating`, { score: nextScore, note: nextNote }, opts),
    );
    adminRatingChain.current = run.then((result) => result.ok);
    return run;
  }

  async function handleAdminRate(value: number) {
    // Recorded immediately (not gated behind the save below resolving) so a
    // note-only save that fires while this is still in flight always sends
    // the score the admin actually just picked, not whatever the last
    // *confirmed* score happened to be. Rolled back to confirmedAdminScore
    // on failure below, so a later note-only save doesn't keep persisting a
    // score that never actually saved.
    latestAdminScore.current = value;
    // Read via the ref (kept current by the effect above), not the `adminNote`
    // closed over at click time -- a keystroke landing between this click
    // and the request resolving would otherwise get silently overwritten
    // by whatever the note looked like when the star was clicked.
    const noteToSend = latestAdminNote.current;
    // This save sends the current note along with the new score, so any
    // note-autosave debounce still waiting to fire would just resend the
    // same thing a moment later -- cancel it instead of double-posting.
    if (noteTimer.current) {
      clearTimeout(noteTimer.current);
      noteTimer.current = null;
    }
    setAdminSaving(true);
    setAdminError(null);
    const { ok, error } = await saveAdminRating(value, noteToSend);
    if (ok) {
      setAdminScore(value);
      confirmedAdminScore.current = value;
      // Only counts as having saved the note if nothing's changed it since
      // -- a keystroke that landed while this was in flight is still dirty.
      if (latestAdminNote.current === noteToSend) {
        noteDirty.current = false;
        setNoteStatus("saved");
      }
    } else {
      setAdminError(error);
      latestAdminScore.current = confirmedAdminScore.current;
      // The note we just tried to send along with this score never made it
      // -- if it's still unsaved, reschedule it as its own save (against
      // the rolled-back score) rather than dropping it silently.
      if (noteDirty.current) handleNoteChange(latestAdminNote.current);
    }
    setAdminSaving(false);
  }

  // The API upserts score and note together, so every note save has to
  // resend the current score too or risk clobbering it with a stale value.
  async function flushNote(value: string) {
    if (noteTimer.current) {
      clearTimeout(noteTimer.current);
      noteTimer.current = null;
    }
    // Nothing to attach the note to until an overall score exists -- the
    // admin-rating row itself doesn't exist yet.
    if (latestAdminScore.current === null) return;
    setAdminError(null);
    setNoteStatus("saving");
    const { ok, error } = await saveAdminRating(latestAdminScore.current, value, { refresh: false });
    if (ok) {
      // Same "did anything change while this was in flight" guard as above.
      if (latestAdminNote.current === value) {
        noteDirty.current = false;
        setNoteStatus("saved");
      }
    } else {
      setAdminError(error);
      // Left dirty on purpose -- the edit is still unsaved, so onBlur and
      // the unmount effect below both know to give it another try even
      // though the timer that would have retried it is gone.
      setNoteStatus("idle");
    }
  }

  function handleNoteChange(value: string) {
    setAdminNote(value);
    noteDirty.current = true;
    if (adminScore === null) return;
    if (noteTimer.current) clearTimeout(noteTimer.current);
    setNoteStatus("saving");
    noteTimer.current = setTimeout(() => flushNote(value), NOTE_AUTOSAVE_DELAY_MS);
  }

  async function handleAdminRateCategory(category: RatingCategoryKey, value: number) {
    setSavingAdminCategory(category);
    setAdminError(null);
    const { ok, error } = await postRating(`/api/movies/${movieId}/admin-rating/category`, {
      category,
      score: value,
    });
    if (ok) setAdminCategoryScores((prev) => ({ ...prev, [category]: value }));
    else setAdminError(error);
    setSavingAdminCategory(null);
  }

  const showTabs = isAdmin;
  const showAdminPanel = showTabs && tab === "admin";

  return (
    <div
      className={`rounded-md border p-3 transition-colors ${
        showAdminPanel
          ? "border-amber-800/50 bg-gradient-to-b from-amber-500/10 to-transparent bg-amber-950/20"
          : "border-neutral-800 bg-neutral-900"
      }`}
    >
      {showTabs && (
        <div className="mb-3 flex gap-4 border-b border-neutral-800">
          {(
            [
              ["member", "Your Rating"],
              ["admin", "Editors’ Rating"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`font-cond -mb-px flex items-center gap-1.5 border-b-2 pb-1.5 text-xs tracking-widest uppercase ${
                tab === key ? "border-red-600 text-neutral-200" : "border-transparent text-neutral-500"
              }`}
            >
              {label}
              {key === "admin" && (
                <span className="font-cond rounded-sm border border-red-700 px-1.5 py-0.5 text-[10px] tracking-wide text-red-500 uppercase">
                  Admin
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {!showAdminPanel ? (
        <div>
          <p className="font-cond mb-2 text-sm tracking-wide text-neutral-400 uppercase">Your rating</p>
          <div className="flex items-center gap-3">
            <StarRatingPicker size="lg" value={score} disabled={saving} onSelect={handleRate} />
            <p className="font-display text-lg text-amber-500">
              {score ?? "—"}
              <span className="font-editorial ml-1 text-xs font-normal text-neutral-500">/ 10</span>
            </p>
          </div>

          {/* Only rendered once a member has rated overall -- keeps the widget
              from front-loading three more picker rows before someone's done
              the one thing most visitors come to do. */}
          {score !== null && (
            <>
              <p className="font-cond mt-4 mb-1.5 text-sm tracking-wide text-neutral-400 uppercase">
                Rate by category <span className="normal-case">(optional)</span>
              </p>
              <CategoryRatingRows
                scores={categoryScores}
                savingKey={savingCategory}
                onRate={handleRateCategory}
                labelColorClassName="text-neutral-400"
              />
            </>
          )}

          {memberError && <p className="mt-2 text-sm text-red-500">{memberError}</p>}
        </div>
      ) : (
        <div>
          <p className="font-cond mb-2 text-sm tracking-wide text-amber-500 uppercase">Editors&rsquo; rating</p>
          <div className="flex items-center gap-3">
            <StarRatingPicker
              size="lg"
              value={adminScore}
              disabled={adminSaving}
              onSelect={handleAdminRate}
              fillColorClassName="text-amber-500"
            />
            <p className="font-display text-lg text-amber-500">
              {adminScore ?? "—"}
              <span className="font-editorial ml-1 text-xs font-normal text-neutral-500">/ 10</span>
            </p>
          </div>

          <textarea
            value={adminNote}
            onChange={(e) => handleNoteChange(e.target.value)}
            onBlur={(e) => {
              // Only dirty means there's an unsaved edit to flush -- an
              // untouched or already-saved note shouldn't trigger a POST
              // just because the field lost focus.
              if (noteDirty.current) flushNote(e.target.value);
            }}
            disabled={adminScore === null}
            maxLength={MAX_ADMIN_NOTE_LENGTH}
            placeholder={adminScore === null ? "Pick a score above to add a note" : "Editor's note (optional)"}
            rows={2}
            className="mt-3 w-full rounded-sm border border-neutral-700 bg-neutral-900 px-2 py-1 text-base text-neutral-100 focus:border-amber-600 focus:outline-none disabled:opacity-50"
          />
          <p className="mt-1 h-4 text-xs text-neutral-500">
            {noteStatus === "saving" ? "Saving…" : noteStatus === "saved" ? "Saved" : ""}
          </p>

          {/* Same progressive-reveal treatment as the member tab: category
              rows only appear once an overall score has been picked. */}
          {adminScore !== null && (
            <>
              <p className="font-cond mb-1.5 text-xs tracking-wide text-amber-500 uppercase">
                Rate by category <span className="normal-case">(optional)</span>
              </p>
              <CategoryRatingRows
                scores={adminCategoryScores}
                savingKey={savingAdminCategory}
                onRate={handleAdminRateCategory}
                labelColorClassName="text-amber-200/70"
                fillColorClassName="text-amber-500"
              />
            </>
          )}

          {adminError && <p className="mt-2 text-sm text-red-500">{adminError}</p>}
        </div>
      )}
    </div>
  );
}

// Shared by both tabs' "Rate by category" section -- identical layout and
// interaction, differing only in which scores/handler they're wired to and
// which color theme (member yellow vs. admin amber) the row uses.
function CategoryRatingRows({
  scores,
  savingKey,
  onRate,
  labelColorClassName,
  fillColorClassName,
}: {
  scores: Partial<Record<RatingCategoryKey, number>>;
  savingKey: RatingCategoryKey | null;
  onRate: (category: RatingCategoryKey, value: number) => void;
  labelColorClassName: string;
  fillColorClassName?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {RATING_CATEGORIES.map(({ key, label }) => {
        const categoryScore = scores[key] ?? null;
        return (
          <div key={key} className="flex items-center gap-3">
            <p className={`font-cond w-[158px] shrink-0 text-[13px] tracking-[0.08em] uppercase ${labelColorClassName}`}>
              {label}
            </p>
            <StarRatingPicker
              value={categoryScore}
              disabled={savingKey === key}
              onSelect={(value) => onRate(key, value)}
              fillColorClassName={fillColorClassName}
            />
          </div>
        );
      })}
    </div>
  );
}
