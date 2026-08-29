"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function PosterOverrideControl({
  movieId,
  hasOverride,
}: {
  movieId: string;
  hasOverride: boolean;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
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

  return (
    <div className="mt-2 flex flex-col items-start gap-1">
      <div className="flex items-center gap-2">
        <label className="font-cond cursor-pointer rounded-sm border border-neutral-700 px-2 py-1 text-xs tracking-wide text-neutral-300 uppercase hover:bg-neutral-800">
          {uploading ? "Uploading…" : hasOverride ? "Replace poster" : "Upload custom poster"}
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
            onClick={handleRemove}
            className="font-cond text-xs tracking-wide text-neutral-400 uppercase hover:text-red-400"
          >
            Remove
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
