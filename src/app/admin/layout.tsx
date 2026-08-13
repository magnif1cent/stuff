import Link from "next/link";
import { redirect } from "next/navigation";
import { requireReviewerSession } from "@/lib/require-admin";

// REVIEWER only gets Movies (pending-submission review, not the full
// catalog — see AdminMoviesPage) and Fight Scene Tags, plus the same
// self-service Account page ADMIN gets. TMDB import and News & Updates stay
// full-admin-only, so they're marked adminOnly rather than left off this
// list entirely — omitting them here would mean re-declaring the same nav
// shape twice instead of filtering one list.
const NAV_LINKS = [
  { href: "/admin", label: "Dashboard", adminOnly: false },
  { href: "/admin/movies", label: "Movies", adminOnly: false },
  { href: "/admin/import", label: "Import from TMDB", adminOnly: true },
  { href: "/admin/fight-scene-tags", label: "Fight Scene Tags", adminOnly: false },
  { href: "/admin/news", label: "News & Updates", adminOnly: true },
  { href: "/admin/account", label: "Account", adminOnly: false },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireReviewerSession();
  if (!session) {
    redirect("/");
  }
  const isAdmin = session.user.role === "ADMIN";
  const links = NAV_LINKS.filter((link) => isAdmin || !link.adminOnly);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-10 sm:flex-row">
      <nav className="rail-scrollbar flex shrink-0 gap-1 overflow-x-auto sm:w-48 sm:flex-col sm:overflow-visible">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="whitespace-nowrap rounded-md px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-900 hover:text-white"
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
