"use client";

import { useState } from "react";

// Wraps the navbar's search bar + nav links (passed as children, still
// server-rendered by Navbar) so they can collapse behind a hamburger button
// on mobile. At sm:+ this is a no-op: sm:contents removes the wrapper from
// the box tree entirely, so children participate directly in Navbar's flex
// row exactly as before (picking up their own sm:order-*/sm:flex-* classes
// unchanged) and the toggle button itself is sm:hidden.
export function MobileNavToggle({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        aria-label={open ? "Close menu" : "Open menu"}
        className="ml-auto flex h-9 w-9 items-center justify-center rounded-md border border-neutral-700 text-neutral-300 hover:text-white sm:hidden"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-5 w-5">
          {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>
      {/* Closes the panel on any click inside it (a nav link, the Lists
          submenu chevron, Sign out) -- Navbar stays mounted across
          client-side navigations, so without this the panel would still
          show open on the next page. */}
      <div
        id="mobile-nav-panel"
        onClick={() => setOpen(false)}
        className={`${open ? "flex" : "hidden"} w-full flex-col gap-3 sm:contents`}
      >
        {children}
      </div>
    </>
  );
}
