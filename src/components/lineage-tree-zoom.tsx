"use client";

import type { ReactNode } from "react";
import { TransformWrapper, TransformComponent, useControls } from "react-zoom-pan-pinch";

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

// Pan/zoom for the full-tree pages only (/actors/[personId]/lineage and
// /lineage/[figureId]) -- not the small inline teaser on an actor's own
// page, which stays fixed-scale and embedded in the page's normal scroll
// on purpose (capturing drag/pinch gestures inside a small card on an
// otherwise plain-scrolling page would fight the page more than help).
//
// A tree several generations deep can be taller and wider than any one
// screen at once, and no single fixed scale can serve both "see the whole
// shape" and "read this branch" -- one either shrinks text/photos into
// illegibility to fit the width, or stays legible and requires endless
// scrolling to see the extent. Interactive zoom is the only way to serve
// both from the same tree. See DECISIONS.md.
//
// The wrapper's viewport is a fixed, bounded box (not sized to the tree's
// own, potentially huge, natural dimensions) -- react-zoom-pan-pinch pans
// and zooms *within* that box; the page itself no longer grows to the
// tree's full height.
export function LineageTreeZoom({ width, height, children }: { width: number; height: number; children: ReactNode }) {
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
