"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useClickOutside } from "@/hooks/use-click-outside";

// Click-to-toggle avatar+username menu, same interaction pattern as
// NavDropdown. Kept as its own component rather than reusing NavDropdown
// directly: the trigger needs an avatar prefix, and one of its two items is
// an action (sign out) rather than a link.
export function AccountNavMenu({ username }: { username: string }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  useClickOutside(wrapperRef, () => setOpen(false), open);
  const initial = username.charAt(0).toUpperCase();

  return (
    <div ref={wrapperRef} className="relative flex items-center">
      <button
        onClick={(e) => {
          // On mobile this button lives inside MobileNavToggle's panel,
          // which closes the whole hamburger menu on any click inside it.
          // Without stopping propagation, that fires here too and closes
          // the panel in the same instant this menu tries to open. This
          // button never navigates on its own, so the panel has no reason
          // to close (see the identical note in NavDropdown).
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="flex items-center gap-1.5 text-sm whitespace-nowrap text-neutral-300 hover:text-white"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-700 text-xs font-semibold text-neutral-100">
          {initial}
        </span>
        {username}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-3 w-3 text-neutral-500"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full right-0 z-30 mt-1.5 min-w-36 rounded-md border border-neutral-700 bg-neutral-800 p-1 shadow-xl">
          <Link
            href={`/members/${username}`}
            onClick={() => setOpen(false)}
            className="block rounded px-3 py-1.5 text-sm whitespace-nowrap text-neutral-100 hover:bg-neutral-700"
          >
            My Profile
          </Link>
          <div className="my-1 border-t border-neutral-700" />
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="block w-full rounded px-3 py-1.5 text-left text-sm whitespace-nowrap text-neutral-300 hover:bg-neutral-700"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
