"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { TmdbImageGalleryDialog } from "@/components/tmdb-image-gallery-dialog";

// Same wrap-the-image, pencil-badge-in-the-corner pattern as
// PosterOverrideControl, trimmed down: no upload path (backdrops are always
// picked from TMDB's own gallery, never uploaded), and no unrelated
// recommend-toggle riding along, since that's specifically a poster-menu
// convenience, not a general admin-menu one.
export function BackdropOverrideControl({
  movieId,
  hasOverride,
  children,
}: {
  movieId: string;
  hasOverride: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
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

  async function pickBackdrop(filePath: string) {
    const res = await fetch(`/api/admin/movies/${movieId}/backdrop`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ backdropPath: filePath }),
    });
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
    if (!window.confirm("Remove the custom backdrop and fall back to the TMDB one?")) return;
    setError(null);
    const res = await fetch(`/api/admin/movies/${movieId}/backdrop`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong.");
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
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label="Backdrop options"
        className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-neutral-500 bg-neutral-950/80 text-neutral-300"
      >
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
      </button>

      {menuOpen && (
        <div className="absolute top-9 right-1.5 z-10 w-max min-w-40 rounded-md border border-neutral-700 bg-neutral-800 p-1 shadow-xl">
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setError(null);
              setGalleryOpen(true);
            }}
            className="block w-full rounded px-3 py-1.5 text-left text-sm text-neutral-100 hover:bg-neutral-700"
          >
            Pick another backdrop
          </button>
          {hasOverride && (
            <button
              type="button"
              onClick={handleRemove}
              className="w-full rounded px-3 py-1.5 text-left text-sm text-neutral-100 hover:bg-neutral-700 hover:text-red-400"
            >
              Remove backdrop
            </button>
          )}
        </div>
      )}

      {error && (
        <p className="absolute top-9 right-1.5 z-10 rounded-md bg-neutral-950/90 px-2 py-1 text-xs text-red-500">
          {error}
        </p>
      )}

      <TmdbImageGalleryDialog
        open={galleryOpen}
        title="Pick another backdrop"
        fetchUrl={`/api/admin/movies/${movieId}/backdrop/options`}
        aspectClassName="aspect-video"
        gridClassName="grid-cols-1 sm:grid-cols-2"
        emptyMessage="No other backdrops available for this movie on TMDB."
        onPick={pickBackdrop}
        onClose={() => setGalleryOpen(false)}
      />
    </div>
  );
}
