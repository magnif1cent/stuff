"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// Wraps the poster image itself (passed as children) rather than sitting
// below it: the whole poster is the tap target, with a small pencil badge
// as the only visual hint it's interactive (admin-only). Replaces the
// earlier always-visible "Replace poster"/"Remove" row, which cost real
// layout space year-round for a control most visitors never see. The
// recommend toggle rides along in the same menu for the same reason --
// it's another admin-only action that used to be its own permanent row
// (see DECISIONS.md); the recommender badges it affects stay visible to
// everyone and live elsewhere (the byline row), since only the *toggle*
// is admin-only.
export function PosterOverrideControl({
  movieId,
  hasOverride,
  recommendedByMe,
  children,
}: {
  movieId: string;
  hasOverride: boolean;
  recommendedByMe: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [recommendSubmitting, setRecommendSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [menuOpen]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMenuOpen(false);
    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`/api/admin/movies/${movieId}/poster`, { method: "POST", body: formData });
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong.");
      return;
    }
    router.refresh();
  }

  async function handleRemove() {
    setMenuOpen(false);
    if (!window.confirm("Remove the custom poster and fall back to the TMDB one?")) return;
    setError(null);
    const res = await fetch(`/api/admin/movies/${movieId}/poster`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong.");
      return;
    }
    router.refresh();
  }

  async function toggleRecommend() {
    setMenuOpen(false);
    setRecommendSubmitting(true);
    setError(null);
    const res = await fetch(`/api/movies/${movieId}/recommend`, {
      method: recommendedByMe ? "DELETE" : "POST",
    });
    setRecommendSubmitting(false);
    if (!res.ok) {
      setError("Something went wrong.");
      return;
    }
    router.refresh();
  }

  return (
    <div ref={containerRef} className="relative">
      {children}

      <button
        type="button"
        onClick={() => {
          setError(null);
          setMenuOpen((open) => !open);
        }}
        disabled={uploading}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label={uploading ? "Uploading poster…" : "Poster and recommendation options"}
        className="absolute inset-0 flex items-end justify-end rounded-sm"
      >
        <span className="m-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-neutral-500 bg-neutral-950/80 text-neutral-300">
          {uploading ? (
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-neutral-500 border-t-neutral-100" />
          ) : (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3.5 w-3.5"
            >
              <path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          )}
        </span>
      </button>

      {menuOpen && (
        <div className="absolute top-full left-0 z-10 mt-1.5 w-max min-w-40 rounded-md border border-neutral-700 bg-neutral-800 p-1 shadow-xl">
          <label
            tabIndex={0}
            role="button"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            className="block w-full cursor-pointer rounded px-3 py-1.5 text-left text-sm text-neutral-100 hover:bg-neutral-700 focus:bg-neutral-700 focus:outline-none"
          >
            {hasOverride ? "Replace poster" : "Upload custom poster"}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              disabled={uploading}
              className="hidden"
            />
          </label>
          {hasOverride && (
            <button
              type="button"
              onClick={handleRemove}
              className="w-full rounded px-3 py-1.5 text-left text-sm text-neutral-100 hover:bg-neutral-700 hover:text-red-400"
            >
              Remove poster
            </button>
          )}
          <div className="my-1 h-px bg-neutral-700" />
          <button
            type="button"
            onClick={toggleRecommend}
            disabled={recommendSubmitting}
            className="w-full rounded px-3 py-1.5 text-left text-sm text-neutral-100 hover:bg-neutral-700 disabled:opacity-50"
          >
            {recommendedByMe ? "✓ Recommended by you" : "+ Recommend this movie"}
          </button>
        </div>
      )}

      {error && (
        <p className="absolute inset-x-0 top-full z-10 mt-1.5 rounded-md bg-neutral-950/90 px-2 py-1 text-xs text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}
