"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// A plain top-level nav link that highlights itself when it's the current
// page -- everything else about it (styling, markup) matches a bare <Link>;
// this only adds the active-state check, which needs client-side pathname
// awareness (there's no server-side equivalent without threading the
// request path down from the layout).
export function NavLink({
  href,
  isActive,
  children,
}: {
  href: string;
  isActive?: (pathname: string) => boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = isActive ? isActive(pathname) : pathname === href;

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
