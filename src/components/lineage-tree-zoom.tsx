"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { TransformWrapper, TransformComponent, useControls } from "react-zoom-pan-pinch";

const MOBILE_QUERY = "(max-width: 767px)";

function subscribeToMobileQuery(callback: () => void) {
  const mql = window.matchMedia(MOBILE_QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getIsMobileSnapshot() {
  return window.matchMedia(MOBILE_QUERY).matches;
}

function getIsMobileServerSnapshot() {
  return false;
}

function ZoomControls() {
  const { zoomIn, zoomOut, resetTransform } = useControls();
  const buttonClass =
    "flex h-8 w-8 items-center justify-center rounded-full border border-neutral-700 bg-neutral-900/90 leading-none text-neutral-300 hover:border-red-600 hover:text-white";
  return (
    <div className="pointer-events-none absolute bottom-3 right-3 z-10 flex flex-col gap-1.5">
      <button type="button" onClick={() => zoomIn()} aria-label="Zoom in" className={`${buttonClass} pointer-events-auto text-lg`}>
        +
      </button>
      <button type="button" onClick={() => zoomOut()} aria-label="Zoom out" className={`${buttonClass} pointer-events-auto text-lg`}>
        &minus;
      </button>
      <button
        type="button"
        onClick={() => resetTransform()}
        aria-label="Reset zoom"
        className={`${buttonClass} pointer-events-auto text-[10px] font-semibold`}
      >
        1:1
      </button>
    </div>
  );
}

// Pan/zoom is mobile-only. On a desktop-width viewport this renders the
// exact same plain, horizontally-scrolling layout the small actor-page
// teaser always uses -- a mouse-and-trackpad user already has native
// scroll/drag on this page, and a transform-based pan surface would
// otherwise hijack wheel/drag on what would otherwise just be a normal
// scrolling page for them, without the touch-first upside that's the whole
// point on a phone. See DECISIONS.md.
//
// "Mobile" is a client-side matchMedia check, not a server-side guess (no
// viewport info exists at render time) -- this defaults to the plain
// layout on first paint, exactly matching what the server rendered, so
// there's no hydration mismatch, then upgrades to the zoom UI once the
// media query resolves after mount if it's actually a narrow viewport. A
// listener on the query (not just a one-time check) keeps it correct
// across a resize or orientation change, not just whatever the width was
// on load.
//
// A tree several generations deep can be taller and wider than any one
// screen at once, and no single fixed scale can serve both "see the whole
// shape" and "read this branch" -- one either shrinks text/photos into
// illegibility to fit the width, or stays legible and requires endless
// scrolling to see the extent. Interactive zoom is the only way to serve
// both from the same tree, which is why this exists at all on the two
// full-tree pages that pass `zoomable` to LineageTreeBody -- the small
// teaser never does, so it never renders this component in the first
// place.
export function LineageTreeZoom({ width, height, children }: { width: number; height: number; children: ReactNode }) {
  const isMobile = useSyncExternalStore(subscribeToMobileQuery, getIsMobileSnapshot, getIsMobileServerSnapshot);

  if (!isMobile) {
    return <div className="max-w-full overflow-x-auto">{children}</div>;
  }

  return (
    <div className="relative h-[65vh] max-h-[640px] min-h-[380px] w-full overflow-hidden rounded-md border border-neutral-800 bg-neutral-950/40">
      <TransformWrapper
        initialScale={1}
        minScale={0.3}
        maxScale={2.5}
        centerOnInit
        limitToBounds
        wheel={{ step: 0.15 }}
        pinch={{ step: 5 }}
        doubleClick={{ step: 0.6 }}
      >
        <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }} contentStyle={{ width, height }}>
          {children}
        </TransformComponent>
        <ZoomControls />
      </TransformWrapper>
    </div>
  );
}
