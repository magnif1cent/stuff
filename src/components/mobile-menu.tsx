"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import type { Session } from "next-auth";
import { useClickOutside } from "@/hooks/use-click-outside";
import { matchesAnyPath } from "@/lib/nav-match";
import { SearchBar } from "@/components/search-bar";

type MobileMenuUser = Pick<Session["user"], "username" | "role">;

// Inline 24x24 stroke icons (no icon library in the project). Each is the
// inner markup of an <svg> rendered by MenuIcon.
const ICONS = {
  key: <path d="M15 7a4 4 0 1 1-3.9 4.9L4 19v2h3v-2h2v-2h2l1.1-1.1A4 4 0 0 1 15 7zM16 10h.01" />,
  signIn: <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" />,
  film: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M7 3v18M17 3v18M3 8h4M3 16h4M17 8h4M17 16h4M3 12h18" />
    </>
  ),
  timeline: <path d="M3 12h18M7 8v8M12 6v12M17 9v6" />,
  swords: <path d="M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2" />,
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </>
  ),
  trophy: <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3" />,
  plus: <path d="M12 5v14M5 12h14" />,
  shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  list: <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
  signOut: <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
};

function MenuIcon({ name, className = "h-5 w-5" }: { name: keyof typeof ICONS; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {ICONS[name]}
    </svg>
  );
}

const ROW_CLASS =
  "flex w-full items-center gap-4 border-b border-neutral-800 py-3.5 text-left text-sm font-bold tracking-[0.15em] uppercase last:border-b-0";

function MenuRow({
  href,
  icon,
  label,
  matchPaths,
  indent = false,
}: {
  href: string;
  icon: keyof typeof ICONS;
  label: string;
  matchPaths?: string[];
  indent?: boolean;
}) {
  const pathname = usePathname();
  const active = matchesAnyPath(pathname, matchPaths ?? [href]);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`${ROW_CLASS} ${indent ? "pl-9 text-xs" : ""} ${
        active ? "text-white" : "text-neutral-400 hover:text-white"
      }`}
    >
      <span className={active ? "text-red-600" : "text-neutral-500"}>
        <MenuIcon name={icon} className={indent ? "h-4 w-4" : "h-5 w-5"} />
      </span>
      {label}
    </Link>
  );
}

// Mobile-only (sm:hidden) header controls, modeled on Letterboxd's mobile
// nav: a search icon and a hamburger sit at the right of the logo row; the
// hamburger drops a full-width panel of stacked, icon-led, uppercase rows
// over the page (rather than pushing content down), and search expands its
// own row instead of living inside the menu. This is a separate tree from
// the desktop nav rather than the desktop markup restyled per breakpoint --
// a stacked row list and an inline link row share almost no layout, and
// keeping them apart means the desktop dropdowns don't need mobile-specific
// click handling.
export function MobileMenu({ user }: { user: MobileMenuUser | null }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  // Navbar stays mounted across client-side navigations, so collapse the
  // search row once a search result (or the full search page) is opened.
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setSearchOpen(false);
  }

  useClickOutside([panelRef, toggleRef], () => setMenuOpen(false), menuOpen);

  const isStaff = user?.role === "ADMIN" || user?.role === "REVIEWER";

  return (
    <>
      <div className="ml-auto flex items-center gap-1 sm:hidden">
        <button
          type="button"
          onClick={() => {
            setSearchOpen((o) => !o);
            setMenuOpen(false);
          }}
          aria-expanded={searchOpen}
          aria-controls="mobile-search"
          aria-label={searchOpen ? "Close search" : "Search"}
          className="flex h-10 w-10 items-center justify-center text-neutral-300 hover:text-white"
        >
          <MenuIcon name={searchOpen ? "close" : "search"} className="h-6 w-6" />
        </button>
        <button
          ref={toggleRef}
          type="button"
          onClick={() => {
            setMenuOpen((o) => !o);
            setSearchOpen(false);
          }}
          aria-expanded={menuOpen}
          aria-controls="mobile-nav-panel"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          className="flex h-10 w-10 items-center justify-center text-neutral-300 hover:text-white"
        >
          <MenuIcon name={menuOpen ? "close" : "menu"} className="h-6 w-6" />
        </button>
      </div>

      {searchOpen && (
        <div id="mobile-search" className="w-full sm:hidden">
          <SearchBar />
        </div>
      )}

      {/* Positioned against Navbar's sticky <header>, so it overlays the
          page directly beneath the header. Any click inside closes it --
          every row navigates (or signs out). */}
      {menuOpen && (
        <div
          ref={panelRef}
          id="mobile-nav-panel"
          onClick={() => setMenuOpen(false)}
          className="absolute inset-x-0 top-full border-b border-neutral-800 bg-neutral-950 px-4 pb-2 shadow-2xl shadow-black/70 sm:hidden"
        >
          <nav aria-label="Main">
            {user ? (
              <>
                <Link href={`/members/${user.username}`} className={`${ROW_CLASS} text-neutral-200 hover:text-white`}>
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-700 text-xs font-semibold tracking-normal text-neutral-100">
                    {user.username.charAt(0).toUpperCase()}
                  </span>
                  {user.username}
                </Link>
                <MenuRow href={`/members/${user.username}?tab=lists`} icon="list" label="My Lists" indent />
              </>
            ) : (
              <>
                <MenuRow href="/register" icon="key" label="Create account" />
                <MenuRow href="/login" icon="signIn" label="Sign in" />
              </>
            )}
            <MenuRow href="/search" icon="film" label="Movies" />
            <MenuRow
              href="/timeline"
              icon="timeline"
              label="Timeline"
              matchPaths={["/timeline", "/timeline/*"]}
              indent
            />
            <MenuRow href="/search/fights" icon="swords" label="Fights" />
            <MenuRow href="/lists" icon="grid" label="Lists" matchPaths={["/lists", "/lists/*"]} />
            <MenuRow href="/leaderboard" icon="trophy" label="Leaderboard" indent />
            <MenuRow href="/movies/submit" icon="plus" label="Add Movie" />
            {isStaff && <MenuRow href="/admin" icon="shield" label="Admin" matchPaths={["/admin", "/admin/*"]} />}
            {user && (
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className={`${ROW_CLASS} text-neutral-500 hover:text-white`}
              >
                <MenuIcon name="signOut" />
                Sign out
              </button>
            )}
          </nav>
        </div>
      )}
    </>
  );
}
