"use client";

import { useEffect, useRef, useState } from "react";

interface FightSceneResult {
  id: string;
  title: string;
  youtubeVideoId: string;
  movie: { title: string };
}

const DEBOUNCE_MS = 250;
const CANVAS_MAX_WIDTH = 900;

// Base image comes from one of two sources, with a dropped/uploaded
// screenshot always winning: search picks a fight scene and suggests its
// YouTube video thumbnail (proxied through /api/admin/memes/thumbnail so the
// canvas export isn't cross-origin-tainted -- see that route's comment), but
// that's the *video's* thumbnail, not necessarily a frame from the tagged
// fight, so an admin can drop or browse for their own screenshot instead.
// Output is composited entirely client-side on a <canvas> and downloaded as
// a PNG -- nothing is uploaded or persisted server-side.
export function AdminMemeGenerator() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FightSceneResult[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedScene, setSelectedScene] = useState<FightSceneResult | null>(null);
  const [customImageUrl, setCustomImageUrl] = useState<string | null>(null);
  const [customFileName, setCustomFileName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [topCaption, setTopCaption] = useState("");
  const [bottomCaption, setBottomCaption] = useState("");
  const [imageError, setImageError] = useState<string | null>(null);
  const [hasImage, setHasImage] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  // Feature-detected once at mount, matching hero-carousel.tsx's
  // reducedMotion pattern -- Safari/Firefox support for writing images (not
  // just text) to the clipboard is newer and less universal than
  // navigator.clipboard itself, so the button only renders once we know
  // ClipboardItem + clipboard.write actually exist. Doesn't need to react
  // to later changes the way prefers-reduced-motion does, so no subscribing
  // effect -- support isn't something that flips mid-session.
  const [clipboardSupported] = useState(
    () =>
      typeof navigator !== "undefined" &&
      !!navigator.clipboard &&
      typeof navigator.clipboard.write === "function" &&
      typeof window.ClipboardItem !== "undefined",
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  const trimmedQuery = query.trim();

  useEffect(() => {
    if (!trimmedQuery) return;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/memes/search?q=${encodeURIComponent(trimmedQuery)}`);
        if (!res.ok) return;
        const data = await res.json();
        setResults(data.scenes ?? []);
      } catch {
        setResults([]);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [trimmedQuery]);

  const visibleResults = trimmedQuery ? results : [];

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function pickScene(scene: FightSceneResult) {
    setSelectedScene(scene);
    setQuery(`${scene.title} (${scene.movie.title})`);
    setOpen(false);
    // A previously dropped screenshot was for whatever was selected before;
    // picking a new scene goes back to that scene's own thumbnail.
    clearCustomImage();
  }

  function clearCustomImage() {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setCustomImageUrl(null);
    setCustomFileName(null);
  }

  function acceptFile(file: File | undefined | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setImageError("That file isn't an image.");
      return;
    }
    setImageError(null);
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setCustomImageUrl(url);
    setCustomFileName(file.name);
  }

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);


  const imageSrc =
    customImageUrl ?? (selectedScene ? `/api/admin/memes/thumbnail?videoId=${selectedScene.youtubeVideoId}` : null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageSrc) {
      setHasImage(false);
      return;
    }

    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      const scale = Math.min(1, CANVAS_MAX_WIDTH / img.width);
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      drawCaption(ctx, canvas.width, topCaption, "top");
      drawCaption(ctx, canvas.width, bottomCaption, "bottom", canvas.height);
      setHasImage(true);
      setImageError(null);
    };
    img.onerror = () => {
      if (cancelled) return;
      setHasImage(false);
      setImageError("Couldn't load that image.");
    };
    img.src = imageSrc;

    return () => {
      cancelled = true;
    };
  }, [imageSrc, topCaption, bottomCaption]);

  function handleDownload() {
    const canvas = canvasRef.current;
    if (!canvas || !hasImage) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slugify(selectedScene?.title ?? customFileName ?? "meme")}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }

  async function handleCopy() {
    const canvas = canvasRef.current;
    if (!canvas || !hasImage) return;
    setCopyError(null);
    try {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("Canvas produced no image data.");
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopyError("Couldn't copy — try Download instead.");
    }
  }

  const showDropdown = open && visibleResults.length > 0;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <div ref={containerRef} className="relative">
          <label className="mb-1 block text-xs font-medium text-neutral-400">Fight scene</label>
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Search a fight scene by title or movie…"
            className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
          />
          {showDropdown && (
            <ul className="absolute top-full left-0 z-20 mt-1 w-full overflow-hidden rounded-md border border-neutral-800 bg-neutral-950 shadow-xl">
              {visibleResults.map((scene) => (
                <li key={scene.id}>
                  <button
                    type="button"
                    onClick={() => pickScene(scene)}
                    className="flex w-full flex-col items-start px-3 py-2 text-left text-sm text-neutral-200 hover:bg-neutral-800"
                  >
                    <span>{scene.title}</span>
                    <span className="text-[11px] text-neutral-500">{scene.movie.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-1 text-[11px] text-neutral-500">
            Suggests the linked video&rsquo;s thumbnail &mdash; not necessarily a frame from the tagged fight itself.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-400">Or drop a screenshot</label>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              acceptFile(e.dataTransfer.files?.[0]);
            }}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed px-3 py-6 text-center text-sm transition-colors ${
              dragOver ? "border-red-600 bg-red-950/20 text-red-400" : "border-neutral-700 text-neutral-500 hover:border-neutral-500"
            }`}
          >
            {customFileName ? (
              <span className="text-neutral-300">{customFileName}</span>
            ) : (
              <span>Drop an image here, or click to browse</span>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => acceptFile(e.target.files?.[0])}
              className="hidden"
            />
          </div>
          {customImageUrl && (
            <button
              type="button"
              onClick={clearCustomImage}
              className="mt-1 text-[11px] text-neutral-500 hover:text-neutral-300"
            >
              Remove screenshot{selectedScene ? " — use the scene thumbnail instead" : ""}
            </button>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-400">Top caption</label>
          <input
            type="text"
            value={topCaption}
            onChange={(e) => setTopCaption(e.target.value)}
            maxLength={120}
            className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-400">Bottom caption</label>
          <input
            type="text"
            value={bottomCaption}
            onChange={(e) => setBottomCaption(e.target.value)}
            maxLength={120}
            className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
          />
        </div>

        {imageError && <p className="text-xs text-red-500">{imageError}</p>}
        {copyError && <p className="text-xs text-red-500">{copyError}</p>}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleDownload}
            disabled={!hasImage}
            className="rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Download PNG
          </button>
          {clipboardSupported && (
            <button
              type="button"
              onClick={handleCopy}
              disabled={!hasImage}
              className="rounded-md border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm font-semibold text-neutral-100 hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {copied ? "Copied!" : "Copy to Clipboard"}
            </button>
          )}
        </div>
      </div>

      <div className="flex items-start justify-center rounded-md border border-neutral-800 bg-neutral-950 p-4">
        {imageSrc ? (
          <canvas ref={canvasRef} className="max-w-full rounded-sm" />
        ) : (
          <p className="py-12 text-center text-sm text-neutral-600">
            Search a fight scene or drop a screenshot to get started.
          </p>
        )}
      </div>
    </div>
  );
}

function drawCaption(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  text: string,
  position: "top" | "bottom",
  canvasHeight?: number,
) {
  const trimmed = text.trim();
  if (!trimmed) return;

  const padding = canvasWidth * 0.04;
  const maxWidth = canvasWidth - padding * 2;
  const fontSize = Math.max(20, Math.round(canvasWidth / 12));
  const lineHeight = fontSize * 1.15;

  ctx.font = `bold ${fontSize}px Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif`;
  ctx.textAlign = "center";
  ctx.lineWidth = fontSize / 16;
  ctx.strokeStyle = "black";
  ctx.fillStyle = "white";

  const lines = wrapText(ctx, trimmed.toUpperCase(), maxWidth);

  const startY =
    position === "top" ? padding + fontSize : (canvasHeight ?? 0) - padding - (lines.length - 1) * lineHeight;

  lines.forEach((line, i) => {
    const y = startY + i * lineHeight;
    ctx.strokeText(line, canvasWidth / 2, y);
    ctx.fillText(line, canvasWidth / 2, y);
  });
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "meme"
  );
}
