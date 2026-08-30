"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FightSceneCast, FightSceneTag, Person, User } from "@/generated/prisma/client";
import { ShareButton } from "@/components/share-button";
import { AddToListControl, type AddToListItem } from "@/components/add-to-list-control";
import { FavoriteButton } from "@/components/favorite-button";
import { StarRatingPicker } from "@/components/star-rating-picker";
import { youtubeWatchUrl } from "@/lib/youtube";

const MAX_NOTE_LENGTH = 2000;
// How many scenes render before a "Show more" click is needed — enough for
// two full rows on the widest (3-column) layout.
const SCENES_PAGE_SIZE = 6;
const MAX_TITLE_LENGTH = 200;

export type CastOption = Pick<Person, "id" | "name">;
export type TagOption = Pick<FightSceneTag, "id" | "name">;

type FightSceneSubmitter = Pick<User, "username" | "image">;
type FightSceneCastPerson = Pick<Person, "id" | "name" | "profilePath">;
type FightSceneCastItem = Pick<FightSceneCast, "id" | "order"> & { person: FightSceneCastPerson };

// createdAt/updatedAt cross the server-to-client boundary as strings (JSON),
// same reasoning as DiscussionThread.
export type FightSceneItem = {
  id: string;
  // Movie-scoped position (1st scene added = Round 1), not a stored value —
  // computed server-side from creation order among surviving scenes, so
  // deleting one reflows the rest. See handleCreate/handleDelete below for
  // how this stays correct after client-side mutations.
  roundNumber: number;
  title: string;
  youtubeVideoId: string;
  youtubeStartSeconds: number | null;
  isVerified: boolean;
  submittedById: string;
  createdAt: string;
  updatedAt: string;
  submittedBy: FightSceneSubmitter;
  cast: FightSceneCastItem[];
  tags: TagOption[];
  ratingAverage: number | null;
  ratingCount: number;
  adminRatingAverage: number | null;
  adminRatingCount: number;
};

function embedUrl(videoId: string, startSeconds: number | null) {
  const params = new URLSearchParams();
  if (startSeconds) params.set("start", String(startSeconds));
  const query = params.toString();
  return `https://www.youtube-nocookie.com/embed/${videoId}${query ? `?${query}` : ""}`;
}

// Accepts "ss", "mm:ss", or "hh:mm:ss" — whatever an admin is used to typing
// for a video timestamp. Returns null for blank input (clears the start
// time) or `undefined` for unparseable input, so callers can tell the two
// apart.
function parseMmSs(input: string): number | null | undefined {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(":");
  if (parts.length > 3 || parts.some((p) => !/^\d+$/.test(p))) return undefined;
  return parts.reduce((total, part) => total * 60 + parseInt(part, 10), 0);
}

function formatMmSs(totalSeconds: number | null): string {
  if (totalSeconds === null) return "";
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function ChipPicker({
  options,
  selected,
  onToggle,
  tagStyle,
}: {
  options: { id: string; name: string }[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  tagStyle?: boolean;
}) {
  return (
    <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto rounded-md border border-neutral-700 bg-neutral-950 p-2">
      {options.map((option) => (
        <label
          key={option.id}
          className={`flex cursor-pointer items-center gap-1.5 rounded-full border border-neutral-700 px-2 py-1 text-xs text-neutral-300 ${
            tagStyle ? "has-checked:border-red-600 has-checked:bg-red-950/40 has-checked:text-red-300" : "has-checked:border-red-600 has-checked:text-white"
          }`}
        >
          <input
            type="checkbox"
            checked={selected.has(option.id)}
            onChange={() => onToggle(option.id)}
            className="sr-only"
          />
          {option.name}
        </label>
      ))}
    </div>
  );
}

function FightSceneForm({
  castOptions,
  tagOptions,
  initialTitle = "",
  initialUrl = "",
  initialPersonIds = [],
  initialTagIds = [],
  submitLabel,
  submitting,
  onCancel,
  onSubmit,
  isEditing = false,
}: {
  castOptions: CastOption[];
  tagOptions: TagOption[];
  initialTitle?: string;
  initialUrl?: string;
  initialPersonIds?: string[];
  initialTagIds?: string[];
  submitLabel: string;
  submitting: boolean;
  onCancel?: () => void;
  onSubmit: (title: string, youtubeUrl: string, personIds: string[], tagIds: string[]) => void;
  isEditing?: boolean;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [url, setUrl] = useState(initialUrl);
  const [selectedCast, setSelectedCast] = useState<Set<string>>(new Set(initialPersonIds));
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set(initialTagIds));
  const [suggestingTitle, setSuggestingTitle] = useState(false);
  const lastSuggestedTitle = useRef("");

  function toggleCast(id: string) {
    setSelectedCast((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleTag(id: string) {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function suggestTitle() {
    if (!url.trim()) return;
    // Don't clobber a title the submitter already typed themselves — only
    // fill in if it's still blank or still equals our last suggestion.
    if (title.trim() && title !== lastSuggestedTitle.current) return;
    setSuggestingTitle(true);
    try {
      const res = await fetch(`/api/youtube/title?url=${encodeURIComponent(url.trim())}`);
      if (res.ok) {
        const body = await res.json();
        if (typeof body.title === "string" && body.title) {
          lastSuggestedTitle.current = body.title;
          setTitle(body.title);
        }
      }
    } finally {
      setSuggestingTitle(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onBlur={suggestTitle}
        placeholder="Paste the YouTube link to this fight scene…"
        className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-base text-neutral-100 focus:border-red-600 focus:outline-none"
      />
      <p className="text-xs text-neutral-500">
        {isEditing
          ? "Tip: an admin can set or adjust exactly where the clip starts after you submit — no need to re-paste the link for that."
          : "Tip: include a timestamp in the link (e.g. ?t=1m35s or ?t=95) to start the clip at the fight instead of the beginning of the video."}
      </p>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={MAX_TITLE_LENGTH}
        placeholder={suggestingTitle ? "Suggesting a title from YouTube…" : 'Title, e.g. "Mirror Room Finale"'}
        className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-base text-neutral-100 focus:border-red-600 focus:outline-none"
      />
      <div>
        <p className="mb-1 text-xs text-neutral-500">Actors in this scene (select at least one)</p>
        <ChipPicker options={castOptions} selected={selectedCast} onToggle={toggleCast} />
      </div>
      <div>
        <p className="mb-1 text-xs text-neutral-500">Category tags (optional)</p>
        <ChipPicker options={tagOptions} selected={selectedTags} onToggle={toggleTag} tagStyle />
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onSubmit(title, url, [...selectedCast], [...selectedTags])}
          disabled={submitting || !url.trim() || !title.trim() || selectedCast.size === 0}
          className="w-fit rounded-md bg-red-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-50"
        >
          {submitting ? "Saving…" : submitLabel}
        </button>
        {onCancel && (
          <button
            onClick={onCancel}
            className="w-fit rounded-md border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300 hover:bg-neutral-800"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

// "Fight Ticket" styling: ink-on-cream ticket-stub card, distinct from the
// rest of the (dark, serif) site on purpose — this is the differentiator
// feature and reads like a physical tournament ticket rather than a movie
// poster. TICKET_INK / TICKET_STAMP are shared between here and the card
// markup below.
const TICKET_INK = "#1a1712";
const TICKET_MUTED = "#6b6148";
const TICKET_STAMP = "#a4291e";

function ActionChip({ onClick, children }: { onClick: () => void; children: string }) {
  return (
    <button
      onClick={onClick}
      className="flex min-h-8 items-center rounded-sm border px-2.5 text-[10px] tracking-wide uppercase hover:opacity-70"
      style={{ borderColor: TICKET_INK }}
    >
      {children}
    </button>
  );
}

function RatingRow({
  label,
  score,
  onRate,
  disabled,
  fillColorClassName,
}: {
  label: string;
  score: number | null;
  onRate: (value: number) => void;
  disabled: boolean;
  // Ticket ink for "Your rating", ticket stamp-red for Editors' -- the same
  // two colors already used elsewhere on this card (the ink border/text and
  // the rating-average stamp circles), rather than RatingCard's yellow/amber,
  // so the star picker stays inside the ticket's own ink-on-cream palette.
  fillColorClassName: string;
}) {
  return (
    <div className="mt-3">
      <p className="mb-1 text-[10px] uppercase tracking-wide" style={{ color: TICKET_MUTED }}>
        {label}
      </p>
      <div className="flex items-center gap-2">
        <StarRatingPicker size="lg" value={score} disabled={disabled} onSelect={onRate} fillColorClassName={fillColorClassName} />
        <p className="text-sm font-bold" style={{ color: TICKET_INK }}>
          {score ?? "—"}
          <span className="text-[10px] font-normal" style={{ color: TICKET_MUTED }}>
            /10
          </span>
        </p>
      </div>
    </div>
  );
}

export function FightSceneSection({
  movieId,
  initialFightScenes,
  castOptions,
  tagOptions,
  signedIn,
  currentUserId,
  isAdmin,
  canVerify = isAdmin,
  myRatings,
  myAdminRatings,
  myMemberLists = [],
  mySavedListIdsByScene = {},
  myFavoriteSceneIds = [],
  heading = "Fights",
  allowAdd = true,
  detail = false,
  totalRounds,
  prevScenePath,
  nextScenePath,
  totalSceneCount,
  viewAllHref,
}: {
  movieId: string;
  initialFightScenes: FightSceneItem[];
  castOptions: CastOption[];
  tagOptions: TagOption[];
  signedIn: boolean;
  currentUserId: string | null;
  // Full admin powers: delete any scene, adjust start-time, set the
  // editors' rating/note. Deliberately not the same gate as canVerify below.
  isAdmin: boolean;
  // Verify/unverify only — granted to REVIEWER as well as ADMIN. Defaults to
  // isAdmin's value so existing call sites that don't pass it yet keep
  // exactly today's behavior (admin-only) instead of silently losing the
  // verify button.
  canVerify?: boolean;
  myRatings: Record<string, number>;
  myAdminRatings: Record<string, number>;
  // The signed-in member's public lists, and which of those already contain
  // each scene — used to seed the "save to list" control per card.
  myMemberLists?: { id: string; name: string }[];
  mySavedListIdsByScene?: Record<string, string[]>;
  // Which scenes the signed-in member has already favorited.
  myFavoriteSceneIds?: string[];
  heading?: string | null;
  allowAdd?: boolean;
  // Permalink-page mode: grows the video to full card width (it's the
  // destination, not a grid item) and turns the round label into a
  // "Round N of totalRounds" stepper. Only meaningful with a single scene.
  detail?: boolean;
  totalRounds?: number;
  prevScenePath?: string | null;
  nextScenePath?: string | null;
  // Movie-page teaser mode: initialFightScenes is only a partial list (the
  // newest one, per FEATURED_FIGHT_COUNT), not every scene for the movie, so
  // the usual "Show more" in-place pagination can't work -- there's nothing
  // further to reveal from what this component was handed. totalSceneCount
  // is the real count (fetched cheaply server-side, e.g. from round numbers)
  // and viewAllHref points at the full collection page; passing viewAllHref
  // switches the footer from "Show more" to a "View all N" link and renders
  // the grid as a single spotlight column instead of a multi-column grid.
  totalSceneCount?: number;
  viewAllHref?: string;
}) {
  const router = useRouter();
  const [scenes, setScenes] = useState(initialFightScenes);
  const [ratings, setRatings] = useState(myRatings);
  const [adminRatings, setAdminRatings] = useState(myAdminRatings);
  const [adding, setAdding] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adminNoteDrafts, setAdminNoteDrafts] = useState<Record<string, string>>({});
  const [startTimeDrafts, setStartTimeDrafts] = useState<Record<string, string>>({});
  const [visibleCount, setVisibleCount] = useState(SCENES_PAGE_SIZE);
  // Which cards have their admin-only controls (start time, editor
  // rating/note) expanded — collapsed by default so an admin's own cards
  // aren't cluttered with tools they're not currently using.
  const [expandedAdminIds, setExpandedAdminIds] = useState<Set<string>>(new Set());
  // Which cards have their Edit/Delete/Verify chips expanded — separate from
  // expandedAdminIds since "Manage" is available to any submitter (not just
  // admins) and gates a different part of the card (the footer chip row, not
  // the admin tools panel below the video).
  const [expandedActionIds, setExpandedActionIds] = useState<Set<string>>(new Set());

  function toggleAdminTools(id: string) {
    setExpandedAdminIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleActions(id: string) {
    setExpandedActionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleCreate(title: string, youtubeUrl: string, personIds: string[], tagIds: string[]) {
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/movies/${movieId}/fight-scenes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, youtubeUrl, personIds, tagIds }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong.");
      return;
    }
    const { fightScene } = await res.json();
    setScenes((prev) => [
      ...prev,
      {
        ...fightScene,
        // The new scene is always the most recently created, so it's the
        // highest round number — one past however many currently exist.
        roundNumber: prev.length + 1,
        ratingAverage: null,
        ratingCount: 0,
        adminRatingAverage: null,
        adminRatingCount: 0,
      },
    ]);
    setAdding(false);
    setVisibleCount((prev) => prev + 1);
  }

  async function handleEdit(id: string, title: string, youtubeUrl: string, personIds: string[], tagIds: string[]) {
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/movies/${movieId}/fight-scenes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, youtubeUrl, personIds, tagIds }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong.");
      return;
    }
    const { fightScene } = await res.json();
    setScenes((prev) => prev.map((s) => (s.id === id ? { ...s, ...fightScene } : s)));
    setEditingId(null);
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Remove this fight scene? This can't be undone.")) return;
    setError(null);
    const res = await fetch(`/api/movies/${movieId}/fight-scenes/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong.");
      return;
    }
    setScenes((prev) => {
      const deleted = prev.find((s) => s.id === id);
      return prev
        .filter((s) => s.id !== id)
        .map((s) => (deleted && s.roundNumber > deleted.roundNumber ? { ...s, roundNumber: s.roundNumber - 1 } : s));
    });
  }

  async function handleRate(id: string, score: number) {
    setError(null);
    const res = await fetch(`/api/movies/${movieId}/fight-scenes/${id}/rating`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ score }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong.");
      return;
    }
    setRatings((prev) => ({ ...prev, [id]: score }));
    router.refresh();
  }

  async function handleAdminRate(id: string, score: number) {
    setError(null);
    const note = adminNoteDrafts[id];
    const res = await fetch(`/api/movies/${movieId}/fight-scenes/${id}/admin-rating`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ score, note }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong.");
      return;
    }
    setAdminRatings((prev) => ({ ...prev, [id]: score }));
    router.refresh();
  }

  async function handleSetStartTime(id: string) {
    const scene = scenes.find((s) => s.id === id);
    const draft = startTimeDrafts[id] ?? formatMmSs(scene?.youtubeStartSeconds ?? null);
    const startSeconds = parseMmSs(draft);
    if (startSeconds === undefined) {
      setError("Start time must look like mm:ss (e.g. 1:23), or blank to clear it.");
      return;
    }
    setError(null);
    const res = await fetch(`/api/movies/${movieId}/fight-scenes/${id}/start-time`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startSeconds }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong.");
      return;
    }
    setScenes((prev) => prev.map((s) => (s.id === id ? { ...s, youtubeStartSeconds: startSeconds } : s)));
    setStartTimeDrafts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  async function handleVerifyToggle(id: string, verified: boolean) {
    setError(null);
    const res = await fetch(`/api/movies/${movieId}/fight-scenes/${id}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verified }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong.");
      return;
    }
    setScenes((prev) => prev.map((s) => (s.id === id ? { ...s, isVerified: verified } : s)));
  }

  // Always sorted by round number left-to-right/top-to-bottom, regardless of
  // insertion order from create/edit/delete. Only the first page's worth
  // renders until "Show more" is clicked, so a movie with many scenes
  // doesn't dump them all on the page at once.
  const sortedScenes = [...scenes].sort((a, b) => a.roundNumber - b.roundNumber);
  const visibleScenes = sortedScenes.slice(0, visibleCount);
  const remainingSceneCount = sortedScenes.length - visibleScenes.length;
  const editingScene = visibleScenes.find((s) => s.id === editingId) ?? null;

  return (
    <section className="mt-10">
      {heading && (
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="font-serif text-xl font-bold text-white">{heading}</h2>
          {allowAdd && signedIn && !adding && (
            castOptions.length > 0 ? (
              <button
                onClick={() => setAdding(true)}
                className="rounded-md border border-neutral-700 px-3 py-1 text-xs text-neutral-300 hover:bg-neutral-800"
              >
                + Add fight scene
              </button>
            ) : (
              <p className="text-xs text-neutral-500">
                This movie doesn&rsquo;t have any cast members listed yet, so fight scenes can&rsquo;t be tagged
                until one&rsquo;s added.
              </p>
            )
          )}
        </div>
      )}

      {!signedIn && (
        <p className="mb-4 text-sm text-neutral-400">
          <a href="/login" className="text-red-500 hover:underline">
            Sign in
          </a>{" "}
          to add or rate fight scenes.
        </p>
      )}

      {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

      {adding && (
        <div className="mb-6 rounded-md border border-neutral-800 bg-neutral-900 p-3">
          <FightSceneForm
            castOptions={castOptions}
            tagOptions={tagOptions}
            submitLabel="Add fight scene"
            submitting={submitting}
            onCancel={() => setAdding(false)}
            onSubmit={handleCreate}
          />
        </div>
      )}

      {/* Rendered outside the grid below, same as the "add" form above —
          a full-width item spliced into a multi-column CSS grid only lands
          in its original card's spot when that card happened to start a
          row; otherwise auto-placement bumps it to wherever it next fits,
          which is why editing used to open in a different-looking spot
          depending on which scene was clicked. */}
      {editingScene && (
        <div className="mb-6 rounded-md border border-neutral-800 bg-neutral-900 p-3">
          <FightSceneForm
            castOptions={castOptions}
            tagOptions={tagOptions}
            initialTitle={editingScene.title}
            initialUrl={`https://www.youtube.com/watch?v=${editingScene.youtubeVideoId}`}
            initialPersonIds={editingScene.cast.map((c) => c.person.id)}
            initialTagIds={editingScene.tags.map((t) => t.id)}
            submitLabel="Save"
            submitting={submitting}
            onCancel={() => setEditingId(null)}
            onSubmit={(title, url, personIds, tagIds) => handleEdit(editingScene.id, title, url, personIds, tagIds)}
            isEditing
          />
        </div>
      )}

      {/* detail mode is always a single scene meant to fill the page's width, not a grid
          cell sized for scanning many cards — the multi-column grid defeats the point of
          the bigger video if left on here. */}
      <ul
        className={
          detail
            ? "grid grid-cols-1"
            : // Teaser mode is a single spotlight card (FEATURED_FIGHT_COUNT is 1),
              // not a grid cell -- plain single column regardless of breakpoint, so
              // it doesn't read as a truncated grid with implied missing neighbors.
              viewAllHref
              ? "grid grid-cols-1 gap-4"
              : "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        }
      >
        {visibleScenes.map((scene) => {
          const canEdit = currentUserId === scene.submittedById;
          const canDelete = canEdit || isAdmin;
          const permalinkPath = `/movies/${movieId}/fights/${scene.id}`;

          // Shown as its own full-width form above the grid instead
          // (see editingScene above) rather than inline here, so it
          // doesn't duplicate the card also being edited.
          if (editingId === scene.id) {
            return null;
          }

          const avgLabel = scene.ratingAverage ? scene.ratingAverage.toFixed(1) : "—";
          const savedListIds = mySavedListIdsByScene[scene.id] ?? [];
          const listItems: AddToListItem[] = myMemberLists.map((list) => ({
            id: list.id,
            name: list.name,
            hasItem: savedListIds.includes(list.id),
          }));

          return (
            <li
              key={scene.id}
              className="relative bg-[#e8dcc4] p-4 font-mono"
              style={{
                color: TICKET_INK,
                clipPath:
                  "polygon(0 10px, 10px 0, calc(100% - 10px) 0, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0 calc(100% - 10px))",
              }}
            >
              <div className="flex items-center justify-between text-[10px] tracking-wider uppercase" style={{ color: TICKET_MUTED }}>
                {detail && totalRounds ? (
                  <div className="flex items-center gap-1.5">
                    {prevScenePath ? (
                      <Link
                        href={prevScenePath}
                        aria-label="Previous round"
                        className="flex h-[18px] w-[18px] items-center justify-center rounded border hover:opacity-70"
                        style={{ borderColor: TICKET_MUTED }}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5">
                          <path d="M15 18l-6-6 6-6" />
                        </svg>
                      </Link>
                    ) : (
                      <span className="h-[18px] w-[18px]" />
                    )}
                    <span>
                      Round {scene.roundNumber} of {totalRounds}
                    </span>
                    {nextScenePath ? (
                      <Link
                        href={nextScenePath}
                        aria-label="Next round"
                        className="flex h-[18px] w-[18px] items-center justify-center rounded border hover:opacity-70"
                        style={{ borderColor: TICKET_MUTED }}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5">
                          <path d="M9 18l6-6-6-6" />
                        </svg>
                      </Link>
                    ) : (
                      <span className="h-[18px] w-[18px]" />
                    )}
                  </div>
                ) : (
                  <span>Round {scene.roundNumber}</span>
                )}
                <div className="flex items-center gap-2.5 sm:gap-1.5">
                  <FavoriteButton
                    movieId={movieId}
                    fightSceneId={scene.id}
                    initialFavorite={myFavoriteSceneIds.includes(scene.id)}
                    signedIn={signedIn}
                  />
                  <AddToListControl
                    target={{ type: "fightScene", id: scene.id }}
                    initialLists={listItems}
                    signedIn={signedIn}
                    variant="icon"
                  />
                  <ShareButton
                    path={permalinkPath}
                    title={scene.title}
                    variant="icon"
                    youtubeUrl={detail ? youtubeWatchUrl(scene.youtubeVideoId, scene.youtubeStartSeconds) : undefined}
                  />
                </div>
              </div>

              <div className="mt-3 border-t-2 border-dashed pt-3" style={{ borderColor: "#b8ab8c" }}>
                {/* Smaller inset "photo" on the grid card, to read as a ticket detail — but full
                    width in detail mode, where watching the clip is the reason someone's here. */}
                <div
                  className={
                    detail
                      ? "relative aspect-video w-full overflow-hidden border-[3px]"
                      : "relative mx-auto aspect-video w-2/3 max-w-[180px] overflow-hidden border-[3px]"
                  }
                  style={{ borderColor: TICKET_INK, background: TICKET_INK }}
                >
                  <iframe
                    src={embedUrl(scene.youtubeVideoId, scene.youtubeStartSeconds)}
                    title={scene.title}
                    className="pointer-events-none h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                  {/* An overlay link, not the iframe's own controls — tapping the
                      embed on mobile often opens the YouTube app to the channel
                      instead of this clip, so the whole frame goes straight to
                      the exact watch URL (with timestamp) instead. */}
                  <a
                    href={youtubeWatchUrl(scene.youtubeVideoId, scene.youtubeStartSeconds)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Watch "${scene.title}" on YouTube`}
                    className="absolute inset-0"
                  />
                </div>
                {isAdmin && expandedAdminIds.has(scene.id) && (
                  <div className="mt-2 flex items-center justify-center gap-1.5 text-[10px]" style={{ color: TICKET_MUTED }}>
                    <span className="uppercase tracking-wide">Start at</span>
                    <input
                      type="text"
                      value={startTimeDrafts[scene.id] ?? formatMmSs(scene.youtubeStartSeconds)}
                      onChange={(e) => setStartTimeDrafts((prev) => ({ ...prev, [scene.id]: e.target.value }))}
                      placeholder="mm:ss"
                      className="min-h-8 w-16 border bg-transparent px-1 text-center text-base focus:outline-none"
                      style={{ borderColor: TICKET_INK, color: TICKET_INK }}
                    />
                    <ActionChip onClick={() => handleSetStartTime(scene.id)}>Save</ActionChip>
                  </div>
                )}
              </div>

              <Link href={permalinkPath} className="mt-3 block text-lg font-bold hover:opacity-70" style={{ fontFamily: "Georgia, serif" }}>
                {scene.title}
              </Link>
              {scene.cast.length > 0 && (
                <p className="mt-0.5 text-[11px] tracking-wide uppercase" style={{ color: TICKET_MUTED }}>
                  Featuring{" "}
                  {scene.cast.map((c, i) => (
                    <span key={c.person.id}>
                      {i > 0 && ", "}
                      <Link href={`/actors/${c.person.id}`} className="hover:underline">
                        {c.person.name}
                      </Link>
                    </span>
                  ))}
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-1.5">
                {scene.tags.map((tag) => (
                  <Link
                    key={tag.id}
                    href={`/search/fights?tag=${encodeURIComponent(tag.name)}`}
                    className="border px-2 py-0.5 text-[10px] tracking-wide uppercase underline underline-offset-2 hover:opacity-70"
                    style={{ borderColor: TICKET_INK }}
                  >
                    {tag.name}
                  </Link>
                ))}
                {scene.isVerified && (
                  <span className="px-2 py-0.5 text-[10px] tracking-wide uppercase" style={{ background: TICKET_INK, color: "#e8dcc4" }}>
                    ✓ Verified
                  </span>
                )}
              </div>

              <div className="mt-4 flex items-start justify-between gap-3 border-t pt-3" style={{ borderColor: "#b8ab8c" }}>
                <div>
                  <p className="text-[10px] tracking-wide uppercase" style={{ color: TICKET_MUTED }}>
                    Submitted by
                    <br />
                    {scene.submittedBy.username}
                  </p>
                  {(canEdit || canDelete || canVerify || isAdmin) && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(canEdit || canDelete || canVerify) && (
                        <ActionChip onClick={() => toggleActions(scene.id)}>
                          {expandedActionIds.has(scene.id) ? "Close" : "Manage"}
                        </ActionChip>
                      )}
                      {expandedActionIds.has(scene.id) && (
                        <>
                          {canEdit && <ActionChip onClick={() => setEditingId(scene.id)}>Edit</ActionChip>}
                          {canDelete && <ActionChip onClick={() => handleDelete(scene.id)}>Delete</ActionChip>}
                          {canVerify && (
                            <ActionChip onClick={() => handleVerifyToggle(scene.id, !scene.isVerified)}>
                              {scene.isVerified ? "Unverify" : "Verify"}
                            </ActionChip>
                          )}
                        </>
                      )}
                      {isAdmin && (
                        <ActionChip onClick={() => toggleAdminTools(scene.id)}>
                          {expandedAdminIds.has(scene.id) ? "Hide admin tools" : "Admin tools"}
                        </ActionChip>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <div className="text-center">
                    <div
                      className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border-2 text-base font-bold"
                      style={{ borderColor: TICKET_STAMP, color: TICKET_STAMP, transform: "rotate(-8deg)" }}
                    >
                      {avgLabel}
                    </div>
                    <p className="text-[8.5px] tracking-wide uppercase" style={{ color: TICKET_MUTED }}>
                      Member ({scene.ratingCount})
                    </p>
                  </div>
                  {scene.adminRatingCount > 0 && (
                    <div className="text-center">
                      <div
                        className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border-2 text-base font-bold"
                        style={{ borderColor: TICKET_STAMP, color: TICKET_STAMP, transform: "rotate(6deg)" }}
                      >
                        {scene.adminRatingAverage?.toFixed(1)}
                      </div>
                      <p className="text-[8.5px] tracking-wide uppercase" style={{ color: TICKET_MUTED }}>
                        Editors&rsquo;
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {signedIn && (
                <RatingRow
                  label="Your rating"
                  score={ratings[scene.id] ?? null}
                  onRate={(value) => handleRate(scene.id, value)}
                  disabled={false}
                  fillColorClassName={`text-[${TICKET_INK}]`}
                />
              )}

              {isAdmin && expandedAdminIds.has(scene.id) && (
                <div className="mt-3 border-t pt-3" style={{ borderColor: "#b8ab8c" }}>
                  <RatingRow
                    label="Editors' rating (admin only)"
                    score={adminRatings[scene.id] ?? null}
                    onRate={(value) => handleAdminRate(scene.id, value)}
                    disabled={false}
                    fillColorClassName={`text-[${TICKET_STAMP}]`}
                  />
                  <textarea
                    value={adminNoteDrafts[scene.id] ?? ""}
                    onChange={(e) => setAdminNoteDrafts((prev) => ({ ...prev, [scene.id]: e.target.value }))}
                    maxLength={MAX_NOTE_LENGTH}
                    placeholder="Editor's note (optional)"
                    rows={2}
                    className="mt-2 w-full border bg-transparent px-2 py-1 text-base focus:outline-none"
                    style={{ borderColor: TICKET_INK, color: TICKET_INK }}
                  />
                </div>
              )}
            </li>
          );
        })}

        {scenes.length === 0 && (
          <p className="text-sm text-neutral-500">No fight scenes added yet.</p>
        )}
      </ul>
      {viewAllHref
        ? totalSceneCount !== undefined &&
          totalSceneCount > scenes.length && (
            <Link
              href={viewAllHref}
              className="mt-4 block w-full rounded-md border border-red-800/60 bg-gradient-to-b from-red-950/30 to-transparent py-2 text-center text-sm font-medium text-red-400 hover:border-red-700 hover:text-red-300"
            >
              View all {totalSceneCount} fights
            </Link>
          )
        : remainingSceneCount > 0 && (
            <button
              onClick={() => setVisibleCount((prev) => prev + SCENES_PAGE_SIZE)}
              className="mt-4 w-full rounded-md border border-neutral-700 py-2 text-sm text-neutral-300 hover:bg-neutral-800"
            >
              Show more ({remainingSceneCount} more)
            </button>
          )}
    </section>
  );
}
