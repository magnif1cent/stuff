"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClickOutside } from "@/hooks/use-click-outside";

interface NavDropdownItem {
  href: string;
  label: string;
  isActive?: (pathname: string) => boolean;
}

// Shared by every "a link, plus a chevron revealing one or two related
// links" nav item (Movies -> Timeline, Lists -> Leaderboard) -- click to
// toggle rather than hover, so it behaves identically on touch and desktop.
// The label itself stays a real link to `href` (so it still works with
// middle-click/open-in-new-tab/etc.), while the chevron is a separate
// control that only ever opens the dropdown.
export function NavDropdown({
  label,
  href,
  items,
  ariaLabel,
  isActive,
}: {
  label: string;
  href: string;
  items: NavDropdownItem[];
  ariaLabel: string;
  isActive?: (pathname: string) => boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  useClickOutside(wrapperRef, () => setOpen(false), open);
  const pathname = usePathname();
  const active = isActive ? isActive(pathname) : pathname === href;

  return (
    <div ref={wrapperRef} className="relative flex items-center">
      <Link
        href={href}
        className={`flex items-center gap-1.5 text-sm whitespace-nowrap ${
          active ? "text-white" : "text-neutral-300 hover:text-white"
        }`}
      >
        {active && <span className="h-1.5 w-1.5 rounded-full bg-red-600" />}
        {label}
      </Link>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={ariaLabel}
        aria-expanded={open}
        className={`flex h-5 w-5 items-center justify-center hover:text-white ${active ? "text-neutral-100" : "text-neutral-500"}`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-3 w-3"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 z-30 mt-1.5 min-w-36 rounded-md border border-neutral-700 bg-neutral-800 p-1 shadow-xl">
          {items.map((item) => {
            const itemActive = item.isActive ? item.isActive(pathname) : pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center justify-between gap-2 rounded px-3 py-1.5 text-sm whitespace-nowrap hover:bg-neutral-700 ${
                  itemActive ? "text-white" : "text-neutral-100"
                }`}
              >
                {item.label}
                {itemActive && <span className="h-1.5 w-1.5 rounded-full bg-red-600" />}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
