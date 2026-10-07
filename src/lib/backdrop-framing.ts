import type { CSSProperties } from "react";
import type { Movie } from "@/generated/prisma/client";

// Admin-adjustable framing for the movie page's backdrop banner. The model is
// a focal point plus a zoom: (focusX%, focusY%) of the image is used both as
// its object-position and as the transform-origin of the zoom, which keeps
// that one point of the image pinned to the same spot in the frame at any
// zoom level -- so "what to center on" and "how tight" stay independent.

// The banner's frame, shared with the admin framing editor so its preview
// overlays the real banner at exactly the same size and crop. overflow-hidden
// clips the zoom (a CSS scale) to the frame.
export const BACKDROP_FRAME_CLASS =
  "mx-auto aspect-21/10 max-h-[30rem] w-full max-w-[1920px] overflow-hidden";

export type BackdropFraming = Pick<Movie, "backdropFocusX" | "backdropFocusY" | "backdropScale">;

export type ResolvedBackdropFraming = { focusX: number; focusY: number; scale: number };

// Matches the banner's previous hardcoded object-[center_25%], so movies
// nobody has framed look exactly as they did before.
export const DEFAULT_BACKDROP_FRAMING: ResolvedBackdropFraming = { focusX: 50, focusY: 25, scale: 1 };

// object-cover already fills the frame at 1, so zooming out would only
// expose empty bands; past ~2.5x a TMDB "original" backdrop gets soft at
// the banner's 1920px max width.
export const MIN_BACKDROP_SCALE = 1;
export const MAX_BACKDROP_SCALE = 2.5;

export function resolveBackdropFraming(movie: BackdropFraming): ResolvedBackdropFraming {
  return {
    focusX: movie.backdropFocusX ?? DEFAULT_BACKDROP_FRAMING.focusX,
    focusY: movie.backdropFocusY ?? DEFAULT_BACKDROP_FRAMING.focusY,
    scale: movie.backdropScale ?? DEFAULT_BACKDROP_FRAMING.scale,
  };
}

export function backdropFramingStyle({ focusX, focusY, scale }: ResolvedBackdropFraming): CSSProperties {
  const origin = `${focusX}% ${focusY}%`;
  return {
    objectPosition: origin,
    transformOrigin: origin,
    transform: scale === 1 ? undefined : `scale(${scale})`,
  };
}

// Validates an admin's submitted framing, returning the column values to
// store (each null when it equals the default, so saving a reset leaves the
// row exactly like one nobody framed) or an error message.
export function parseBackdropFraming(
  body: unknown,
): { data: BackdropFraming } | { error: string } {
  const { focusX, focusY, scale } = (body ?? {}) as Record<string, unknown>;
  for (const [name, value] of [
    ["focusX", focusX],
    ["focusY", focusY],
  ] as const) {
    if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 100) {
      return { error: `${name} must be an integer from 0 to 100.` };
    }
  }
  if (
    typeof scale !== "number" ||
    !Number.isFinite(scale) ||
    scale < MIN_BACKDROP_SCALE ||
    scale > MAX_BACKDROP_SCALE
  ) {
    return { error: `scale must be a number from ${MIN_BACKDROP_SCALE} to ${MAX_BACKDROP_SCALE}.` };
  }
  const x = focusX as number;
  const y = focusY as number;
  // Two decimals is far finer than a slider step; keeps stored values tidy.
  const s = Math.round(scale * 100) / 100;
  return {
    data: {
      backdropFocusX: x === DEFAULT_BACKDROP_FRAMING.focusX ? null : x,
      backdropFocusY: y === DEFAULT_BACKDROP_FRAMING.focusY ? null : y,
      backdropScale: s === DEFAULT_BACKDROP_FRAMING.scale ? null : s,
    },
  };
}

export const CLEARED_BACKDROP_FRAMING: BackdropFraming = {
  backdropFocusX: null,
  backdropFocusY: null,
  backdropScale: null,
};
