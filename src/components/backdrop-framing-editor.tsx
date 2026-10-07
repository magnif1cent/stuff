"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  BACKDROP_FRAME_CLASS,
  DEFAULT_BACKDROP_FRAMING,
  MAX_BACKDROP_SCALE,
  MIN_BACKDROP_SCALE,
  backdropFramingStyle,
  type ResolvedBackdropFraming,
} from "@/lib/backdrop-framing";

const NUDGE = 2;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

// How far (in screen px) the image moves per 1% change of the focal point
// along one axis, for a frame `frame` px long showing an image that
// object-cover renders `rendered` px long, at zoom `scale`. Derived from
// object-position + transform-origin both being focus%: an image point's
// screen position is linear in focus with this slope, so the drag can map
// pointer movement to focus exactly (the point grabbed stays under the
// pointer). Zero when that axis has nothing to pan (no overflow, no zoom).
function pxPerPercent(frame: number, rendered: number, scale: number) {
  return (frame * (1 - scale) - scale * (rendered - frame)) / 100;
}

// Full-frame overlay that replaces the banner while an admin adjusts it:
// drag to move the focal point, slider to zoom. Renders the same frame
// classes and framing style as the real banner, so what you see here is
// the crop members will get (minus the legibility gradient, left off so the
// image is easy to judge).
export function BackdropFramingEditor({
  movieId,
  imageUrl,
  initial,
  onClose,
}: {
  movieId: string;
  imageUrl: string;
  initial: ResolvedBackdropFraming;
  onClose: () => void;
}) {
  const router = useRouter();
  const frameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number; focusX: number; focusY: number } | null>(null);
  const [natural, setNatural] = useState({ width: 16, height: 9 });
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [refreshing, startTransition] = useTransition();
  const busy = saving || refreshing;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  function slopes() {
    const frame = frameRef.current?.getBoundingClientRect();
    if (!frame) return { x: 0, y: 0 };
    const cover = Math.max(frame.width / natural.width, frame.height / natural.height);
    return {
      x: pxPerPercent(frame.width, natural.width * cover, draft.scale),
      y: pxPerPercent(frame.height, natural.height * cover, draft.scale),
    };
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (busy) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, focusX: draft.focusX, focusY: draft.focusY };
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    const slope = slopes();
    setDraft((d) => ({
      ...d,
      focusX: slope.x ? clamp(drag.focusX + (e.clientX - drag.x) / slope.x, 0, 100) : d.focusX,
      focusY: slope.y ? clamp(drag.focusY + (e.clientY - drag.y) / slope.y, 0, 100) : d.focusY,
    }));
  }

  function onPointerUp() {
    dragRef.current = null;
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    // Arrow = move the image that way, so the focal point moves opposite.
    const delta = {
      ArrowLeft: [NUDGE, 0],
      ArrowRight: [-NUDGE, 0],
      ArrowUp: [0, NUDGE],
      ArrowDown: [0, -NUDGE],
    }[e.key];
    if (!delta || busy) return;
    e.preventDefault();
    setDraft((d) => ({
      ...d,
      focusX: clamp(d.focusX + delta[0], 0, 100),
      focusY: clamp(d.focusY + delta[1], 0, 100),
    }));
  }

  async function save() {
    setError(null);
    setSaving(true);
    const res = await fetch(`/api/admin/movies/${movieId}/backdrop/framing`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        focusX: Math.round(draft.focusX),
        focusY: Math.round(draft.focusY),
        scale: draft.scale,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong.");
      return;
    }
    // Closing in the same transition as the refresh keeps this preview up
    // until the re-rendered banner (with the new framing) is ready to swap in.
    startTransition(() => {
      router.refresh();
      onClose();
    });
  }

  return (
    <div className={`absolute inset-x-0 top-0 z-10 ${BACKDROP_FRAME_CLASS}`}>
      <div
        ref={frameRef}
        tabIndex={0}
        role="application"
        aria-label="Backdrop framing. Drag or use arrow keys to reposition."
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        className="absolute inset-0 cursor-move touch-none bg-neutral-900 outline-none select-none focus-visible:ring-2 focus-visible:ring-neutral-300 focus-visible:ring-inset"
      >
        <Image
          src={imageUrl}
          alt=""
          fill
          unoptimized
          draggable={false}
          sizes="(min-width: 1920px) 1920px, 100vw"
          onLoad={(e) => {
            const img = e.currentTarget;
            if (img.naturalWidth && img.naturalHeight) {
              setNatural({ width: img.naturalWidth, height: img.naturalHeight });
            }
          }}
          className="pointer-events-none object-cover"
          style={backdropFramingStyle(draft)}
        />
      </div>

      <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-x-4 gap-y-2 bg-neutral-950/85 px-3 py-2 text-sm text-neutral-200">
        <span className="hidden text-xs text-neutral-400 sm:inline">Drag to reposition</span>
        <label className="flex flex-1 items-center gap-2 sm:max-w-64">
          <span className="text-xs text-neutral-400">Zoom</span>
          <input
            type="range"
            min={MIN_BACKDROP_SCALE}
            max={MAX_BACKDROP_SCALE}
            step={0.05}
            value={draft.scale}
            disabled={busy}
            onChange={(e) => setDraft((d) => ({ ...d, scale: Number(e.target.value) }))}
            className="min-w-0 flex-1 accent-neutral-200"
          />
          <span className="w-10 text-right text-xs tabular-nums">{draft.scale.toFixed(2)}×</span>
        </label>
        {error && <span className="text-xs text-red-500">{error}</span>}
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => setDraft(DEFAULT_BACKDROP_FRAMING)}
            className="rounded px-2 py-1 text-neutral-300 hover:bg-neutral-800 disabled:opacity-50"
          >
            Reset
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded px-2 py-1 text-neutral-300 hover:bg-neutral-800 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={save}
            className="rounded bg-neutral-100 px-3 py-1 font-medium text-neutral-950 hover:bg-white disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
