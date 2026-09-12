"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { tmdbImageUrl } from "@/lib/tmdb";

interface PosterOption {
  filePath: string;
  width: number;
  height: number;
}

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

  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [galleryOptions, setGalleryOptions] = useState<PosterOption[]>([]);
  const [selectingPath, setSelectingPath] = useState<string | null>(null);

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

  useEffect(() => {
    if (!galleryOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setGalleryOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [galleryOpen]);

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

  async function openGallery() {
    setMenuOpen(false);
    setError(null);
    setGalleryOpen(true);
    setGalleryLoading(true);
    const res = await fetch(`/api/admin/movies/${movieId}/poster/options`);
    setGalleryLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setGalleryOpen(false);
      setError(body.error ?? "Couldn't load poster options.");
      return;
    }
    const body = await res.json();
    setGalleryOptions(body.options ?? []);
  }

  async function pickPoster(filePath: string) {
    setSelectingPath(filePath);
    const res = await fetch(`/api/admin/movies/${movieId}/poster`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ posterPath: filePath }),
    });
    setSelectingPath(null);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong.");
      return;
    }
    setGalleryOpen(false);
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
            Upload poster
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              disabled={uploading}
              className="hidden"
            />
          </label>
          <button
            type="button"
            onClick={openGallery}
            className="block w-full rounded px-3 py-1.5 text-left text-sm text-neutral-100 hover:bg-neutral-700"
          >
            Pick another poster
          </button>
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

      {galleryOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Pick another poster"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setGalleryOpen(false);
          }}
        >
          <div className="flex max-h-[85dvh] w-full max-w-2xl flex-col rounded-md border border-neutral-700 bg-neutral-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
              <span className="font-serif text-sm font-bold text-white">Pick another poster</span>
              <button
                type="button"
                onClick={() => setGalleryOpen(false)}
                aria-label="Close"
                className="flex h-7 w-7 items-center justify-center rounded-md border border-neutral-700 text-neutral-300 hover:text-white"
              >
                ×
              </button>
            </div>

            <div className="overflow-y-auto p-4">
              {galleryLoading ? (
                <p className="text-sm text-neutral-400">Loading posters…</p>
              ) : galleryOptions.length === 0 ? (
                <p className="text-sm text-neutral-400">No other posters available for this movie on TMDB.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {galleryOptions.map((option) => {
                    const thumbUrl = tmdbImageUrl(option.filePath, "w342");
                    const busy = selectingPath === option.filePath;
                    return (
                      <button
                        key={option.filePath}
                        type="button"
                        onClick={() => pickPoster(option.filePath)}
                        disabled={selectingPath !== null}
                        className="relative aspect-2/3 overflow-hidden rounded-sm bg-neutral-800 ring-red-600 hover:ring-2 disabled:opacity-50"
                      >
                        {thumbUrl && (
                          <Image src={thumbUrl} alt="" fill unoptimized sizes="150px" className="object-cover" />
                        )}
                        {busy && (
                          <span className="absolute inset-0 flex items-center justify-center bg-black/60">
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-500 border-t-neutral-100" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
