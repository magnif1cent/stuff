"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { tmdbImageUrl } from "@/lib/tmdb";

export interface TmdbImageOption {
  filePath: string;
  width: number;
  height: number;
}

// Shared by the poster and backdrop override pickers -- a modal gallery of
// TMDB's own alternate images for a movie, fetched from `fetchUrl` while
// open. `aspectClassName`/`gridClassName` differ per caller since posters
// (tall, 2:3) and backdrops (wide, 16:9) need different thumbnail shapes and
// column counts to read well. `onPick` does the actual save (and closing the
// dialog on success is its job, not this component's) so it can show its own
// error state.
export function TmdbImageGalleryDialog({
  open,
  title,
  fetchUrl,
  aspectClassName,
  gridClassName,
  emptyMessage,
  onPick,
  onClose,
}: {
  open: boolean;
  title: string;
  fetchUrl: string;
  aspectClassName: string;
  gridClassName: string;
  emptyMessage: string;
  onPick: (filePath: string) => Promise<void> | void;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<TmdbImageOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectingPath, setSelectingPath] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setOptions([]);
      try {
        const res = await fetch(fetchUrl);
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error ?? "Couldn't load options.");
        if (!cancelled) setOptions(body.options ?? []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Couldn't load options.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();

    return () => {
      cancelled = true;
    };
  }, [open, fetchUrl]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  async function handlePick(filePath: string) {
    setSelectingPath(filePath);
    await onPick(filePath);
    setSelectingPath(null);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[85dvh] w-full max-w-2xl flex-col rounded-md border border-neutral-700 bg-neutral-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
          <span className="font-serif text-sm font-bold text-white">{title}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-md border border-neutral-700 text-neutral-300 hover:text-white"
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto p-4">
          {error ? (
            <p className="text-sm text-red-500">{error}</p>
          ) : loading ? (
            <p className="text-sm text-neutral-400">Loading…</p>
          ) : options.length === 0 ? (
            <p className="text-sm text-neutral-400">{emptyMessage}</p>
          ) : (
            <div className={`grid gap-2 ${gridClassName}`}>
              {options.map((option) => {
                const thumbUrl = tmdbImageUrl(option.filePath, "w342");
                const busy = selectingPath === option.filePath;
                return (
                  <button
                    key={option.filePath}
                    type="button"
                    onClick={() => handlePick(option.filePath)}
                    disabled={selectingPath !== null}
                    className={`relative ${aspectClassName} overflow-hidden rounded-sm bg-neutral-800 ring-red-600 hover:ring-2 disabled:opacity-50`}
                  >
                    {thumbUrl && (
                      <Image src={thumbUrl} alt="" fill unoptimized sizes="200px" className="object-cover" />
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
  );
}
