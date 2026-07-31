"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FightSceneCast, FightSceneTag, Person, User } from "@/generated/prisma/client";
import { ShareButton } from "@/components/share-button";

const SCORES = Array.from({ length: 10 }, (_, i) => i + 1);
const MAX_NOTE_LENGTH = 2000;
const MAX_TITLE_LENGTH = 200;

export type CastOption = Pick<Person, "id" | "name">;
export type TagOption = Pick<FightSceneTag, "id" | "name">;

type FightSceneSubmitter = Pick<User, "name" | "image">;
type FightSceneCastPerson = Pick<Person, "id" | "name" | "profilePath">;
type FightSceneCastItem = Pick<FightSceneCast, "id" | "order"> & { person: FightSceneCastPerson };

// createdAt/updatedAt cross the server-to-client boundary as strings (JSON),
// same reasoning as DiscussionThread.
export type FightSceneItem = {
  id: string;
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
        className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
      />
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={MAX_TITLE_LENGTH}
        placeholder={suggestingTitle ? "Suggesting a title from YouTube…" : 'Title, e.g. "Mirror Room Finale"'}
        className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
      />
      <div>
        <p className="mb-1 text-xs text-neutral-500">Actors in this scene</p>
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

function RatingRow({
  label,
  color,
  score,
  onRate,
  disabled,
}: {
  label: string;
  color: "yellow" | "amber";
  score: number | null;
  onRate: (value: number) => void;
  disabled: boolean;
}) {
  const activeClass = color === "yellow" ? "bg-yellow-500 text-neutral-950" : "bg-amber-500 text-neutral-950";
  return (
    <div>
      <p className="mb-1 text-xs text-neutral-500">{label}</p>
      <div className="flex flex-wrap gap-1">
        {SCORES.map((value) => (
          <button
            key={value}
            disabled={disabled}
            onClick={() => onRate(value)}
            className={`h-6 w-6 rounded text-xs font-medium transition disabled:opacity-50 ${
              score !== null && value <= score ? activeClass : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
            }`}
          >
            {value}
          </button>
        ))}
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
  myRatings,
  myAdminRatings,
  heading = "Fight Scenes",
  allowAdd = true,
}: {
  movieId: string;
  initialFightScenes: FightSceneItem[];
  castOptions: CastOption[];
  tagOptions: TagOption[];
  signedIn: boolean;
  currentUserId: string | null;
  isAdmin: boolean;
  myRatings: Record<string, number>;
  myAdminRatings: Record<string, number>;
  heading?: string | null;
  allowAdd?: boolean;
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
      { ...fightScene, ratingAverage: null, ratingCount: 0, adminRatingAverage: null, adminRatingCount: 0 },
      ...prev,
    ]);
    setAdding(false);
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
    setScenes((prev) => prev.filter((s) => s.id !== id));
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

  return (
    <section className="mt-10">
      {heading && (
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">{heading}</h2>
          {allowAdd && signedIn && !adding && castOptions.length > 0 && (
            <button
              onClick={() => setAdding(true)}
              className="rounded-md border border-neutral-700 px-3 py-1 text-xs text-neutral-300 hover:bg-neutral-800"
            >
              + Add fight scene
            </button>
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

      <ul className="flex flex-col gap-6">
        {scenes.map((scene) => {
          const canEdit = currentUserId === scene.submittedById;
          const canDelete = canEdit || isAdmin;
          const permalinkPath = `/movies/${movieId}/fight-scenes/${scene.id}`;

          return (
            <li key={scene.id} className="rounded-md border border-neutral-800 bg-neutral-900 p-3">
              {editingId === scene.id ? (
                <FightSceneForm
                  castOptions={castOptions}
                  tagOptions={tagOptions}
                  initialTitle={scene.title}
                  initialPersonIds={scene.cast.map((c) => c.person.id)}
                  initialTagIds={scene.tags.map((t) => t.id)}
                  submitLabel="Save"
                  submitting={submitting}
                  onCancel={() => setEditingId(null)}
                  onSubmit={(title, url, personIds, tagIds) => handleEdit(scene.id, title, url, personIds, tagIds)}
                />
              ) : (
                <>
                  <div className="aspect-video w-full overflow-hidden rounded-md bg-black">
                    <iframe
                      src={embedUrl(scene.youtubeVideoId, scene.youtubeStartSeconds)}
                      title={scene.title}
                      className="h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>

                  <div className="mt-2 flex items-start justify-between gap-2">
                    <Link href={permalinkPath} className="font-medium text-neutral-100 hover:text-red-400">
                      {scene.title}
                    </Link>
                    <ShareButton path={permalinkPath} title={scene.title} variant="icon" />
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                    {scene.cast.map((c) => (
                      <span
                        key={c.id}
                        className="rounded-full border border-neutral-700 px-2 py-0.5 text-xs text-neutral-300"
                      >
                        {c.person.name}
                      </span>
                    ))}
                    {scene.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="rounded-full border border-red-900/60 bg-red-950/30 px-2 py-0.5 text-xs text-red-300"
                      >
                        {tag.name}
                      </span>
                    ))}
                    {scene.isVerified && (
                      <span className="rounded-full bg-red-900/40 px-2 py-0.5 text-xs font-medium text-red-400">
                        ✓ Verified
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-xs text-neutral-500">
                    Submitted by {scene.submittedBy.name ?? "Anonymous"}
                    {canEdit && (
                      <button
                        onClick={() => setEditingId(scene.id)}
                        className="ml-2 text-neutral-400 hover:text-white"
                      >
                        Edit
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(scene.id)}
                        className="ml-2 text-neutral-400 hover:text-red-400"
                      >
                        Delete
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => handleVerifyToggle(scene.id, !scene.isVerified)}
                        className="ml-2 text-neutral-400 hover:text-white"
                      >
                        {scene.isVerified ? "Unverify" : "Verify"}
                      </button>
                    )}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-6">
                    <div>
                      <p className="text-xs text-neutral-500">Member Score</p>
                      <p className="text-lg font-bold text-yellow-500">
                        {scene.ratingAverage ? scene.ratingAverage.toFixed(1) : "—"}{" "}
                        <span className="text-xs font-normal text-neutral-500">/ 10 ({scene.ratingCount})</span>
                      </p>
                    </div>
                    {scene.adminRatingCount > 0 && (
                      <div>
                        <p className="text-xs text-neutral-500">Editors&rsquo; Score</p>
                        <p className="text-lg font-bold text-amber-500">
                          {scene.adminRatingAverage?.toFixed(1)}{" "}
                          <span className="text-xs font-normal text-neutral-500">
                            / 10 ({scene.adminRatingCount})
                          </span>
                        </p>
                      </div>
                    )}
                  </div>

                  {signedIn && (
                    <div className="mt-3">
                      <RatingRow
                        label="Your rating"
                        color="yellow"
                        score={ratings[scene.id] ?? null}
                        onRate={(value) => handleRate(scene.id, value)}
                        disabled={false}
                      />
                    </div>
                  )}

                  {isAdmin && (
                    <div className="mt-3 rounded-md border border-amber-800/50 bg-amber-950/20 p-2">
                      <RatingRow
                        label="Editors' rating (admin only)"
                        color="amber"
                        score={adminRatings[scene.id] ?? null}
                        onRate={(value) => handleAdminRate(scene.id, value)}
                        disabled={false}
                      />
                      <textarea
                        value={adminNoteDrafts[scene.id] ?? ""}
                        onChange={(e) =>
                          setAdminNoteDrafts((prev) => ({ ...prev, [scene.id]: e.target.value }))
                        }
                        maxLength={MAX_NOTE_LENGTH}
                        placeholder="Editor's note (optional)"
                        rows={2}
                        className="mt-2 w-full rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs text-neutral-100 focus:border-amber-600 focus:outline-none"
                      />
                    </div>
                  )}
                </>
              )}
            </li>
          );
        })}

        {scenes.length === 0 && (
          <p className="text-sm text-neutral-500">No fight scenes added yet.</p>
        )}
      </ul>
    </section>
  );
}
