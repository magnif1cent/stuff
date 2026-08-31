"use client";

import { createContext, useContext, useEffect, useState } from "react";

const FilterSheetContext = createContext<{ open: boolean; setOpen: (open: boolean) => void } | null>(null);

function useFilterSheet() {
  const ctx = useContext(FilterSheetContext);
  if (!ctx) throw new Error("useFilterSheet must be used within a FilterSheetProvider");
  return ctx;
}

// Shared by /search and /search/fights, both of which pair a vertical
// sidebar filter form with a results column in the same flex-row layout.
//
// Context rather than lifting state into a single wrapper component: the
// trigger button needs to sit up near the results (so it's reachable
// without scrolling), while the panel it opens has to stay a direct child
// of the page's flex row to keep the sm:+ side-by-side layout (a real
// sidebar there, not a sheet) -- the two aren't adjacent in the DOM.
export function FilterSheetProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return <FilterSheetContext.Provider value={{ open, setOpen }}>{children}</FilterSheetContext.Provider>;
}

function FilterIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="h-3.5 w-3.5">
      <path d="M4 6h16M7 12h10M10 18h4" />
    </svg>
  );
}

export function FilterSheetTrigger({ activeCount }: { activeCount: number }) {
  const { setOpen } = useFilterSheet();
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="inline-flex items-center gap-1.5 rounded-full bg-red-700 px-3.5 py-2.5 text-xs font-semibold whitespace-nowrap text-white hover:bg-red-600 sm:hidden"
    >
      <FilterIcon />
      Filters
      {activeCount > 0 && (
        <span className="rounded-full bg-white/25 px-1.5 py-px font-mono text-[10px]">{activeCount}</span>
      )}
    </button>
  );
}

// Wraps the sidebar filter form (passed as children, still server-rendered
// -- only this shell is a client component). At sm:+ it's a no-op: the
// panel renders as the normal static sidebar and the backdrop never shows,
// same as before this existed. Below sm:, the panel becomes a fixed bottom
// sheet toggled by FilterSheetTrigger.
//
// `footer` (the form's Apply/Clear row) renders as its own non-scrolling
// flex sibling below the scrollable field list, not inside it -- a
// position:sticky footer *inside* the scrolling container looked right at
// scrollTop 0 but pinned to the bottom of the visible area immediately
// (since the content already overflowed it), covering the Sort by field
// still sitting underneath. A separate flex child has no such overlap and
// needs no scroll-offset math. The Apply button lives in `footer`, outside
// the <form> element itself, associated via its form="..." attribute.
export function FilterSheetPanel({ children, footer }: { children: React.ReactNode; footer: React.ReactNode }) {
  const { open, setOpen } = useFilterSheet();

  return (
    <>
      <div
        onClick={() => setOpen(false)}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-black/55 sm:hidden ${open ? "block" : "hidden"}`}
      />
      <div
        role={open ? "dialog" : undefined}
        aria-modal={open ? true : undefined}
        aria-label="Filters"
        className={`${open ? "flex" : "hidden"} fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] w-full flex-col rounded-t-2xl border-t border-neutral-800 bg-neutral-900 shadow-2xl sm:static sm:z-auto sm:order-1 sm:flex sm:h-auto sm:max-h-none sm:w-64 sm:shrink-0 sm:rounded-md sm:border sm:p-4 sm:shadow-none`}
      >
        <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3 sm:hidden">
          <span className="font-serif text-sm font-bold text-white">Filters</span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close filters"
            className="flex h-7 w-7 items-center justify-center rounded-md border border-neutral-700 text-neutral-300 hover:text-white"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="h-3.5 w-3.5">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 sm:flex-none sm:overflow-visible sm:p-0">{children}</div>
        <div className="border-t border-neutral-800 p-4 sm:border-0 sm:p-0 sm:pt-4">{footer}</div>
      </div>
    </>
  );
}
