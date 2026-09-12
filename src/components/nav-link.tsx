"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { matchesAnyPath } from "@/lib/nav-match";

// A plain top-level nav link that highlights itself when it's the current
// page -- everything else about it (styling, markup) matches a bare <Link>;
// this only adds the active-state check, which needs client-side pathname
// awareness (there's no server-side equivalent without threading the
// request path down from the layout). `matchPaths` is plain data (see
// nav-match.ts), not a predicate function, since this renders as a child of
// a Server Component and functions can't cross that boundary as props.
export function NavLink({
  href,
  matchPaths,
  children,
}: {
  href: string;
  matchPaths?: string[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = matchesAnyPath(pathname, matchPaths ?? [href]);

  return (
    <Link
      href={href}
      className={`text-sm whitespace-nowrap ${
        active ? "border-b-2 border-red-600 pb-0.5 text-white" : "text-neutral-300 hover:text-white"
      }`}
    >
      {children}
    </Link>
  );
}
