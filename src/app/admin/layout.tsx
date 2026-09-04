import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireReviewerSession } from "@/lib/require-admin";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// REVIEWER only gets Movies (pending-submission review, not the full
// catalog — see AdminMoviesPage) and Fight Scene Tags, plus the same
// self-service Account page ADMIN gets. TMDB import, Lineage, News &
// Updates, and Meme Generator stay full-admin-only, so they're marked
// adminOnly rather than left off this list entirely — omitting them here
// would mean re-declaring the same nav shape twice instead of filtering one
// list.
//
// Grouped by domain rather than build order: Dashboard and Account are
// ungrouped anchors (overview / self-service, not catalog or content work),
// Catalog covers everything that shapes the data other pages read from, and
// Site Content covers what's published straight to visitors. A group with
// no visible links after the REVIEWER/ADMIN filter (e.g. Site Content for a
// REVIEWER, who can't reach either link in it) renders nothing at all —
// see the render loop below.
const NAV_GROUPS: { label: string | null; links: { href: string; label: string; adminOnly: boolean }[] }[] = [
  { label: null, links: [{ href: "/admin", label: "Dashboard", adminOnly: false }] },
  {
    label: "Catalog",
    links: [
      { href: "/admin/movies", label: "Movies", adminOnly: false },
      { href: "/admin/import", label: "Import from TMDB", adminOnly: true },
      { href: "/admin/fight-scene-tags", label: "Fight Scene Tags", adminOnly: false },
      { href: "/admin/lineage", label: "Lineage", adminOnly: true },
    ],
  },
  {
    label: "Site Content",
    links: [
      { href: "/admin/news", label: "News & Updates", adminOnly: true },
      { href: "/admin/memes", label: "Meme Generator", adminOnly: true },
    ],
  },
  { label: null, links: [{ href: "/admin/account", label: "Account", adminOnly: false }] },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireReviewerSession();
  if (!session) {
    redirect("/");
  }
  const isAdmin = session.user.role === "ADMIN";
  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    links: group.links.filter((link) => isAdmin || !link.adminOnly),
  })).filter((group) => group.links.length > 0);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-10 sm:flex-row">
      <nav className="rail-scrollbar flex shrink-0 gap-1 overflow-x-auto sm:w-48 sm:flex-col sm:overflow-visible">
        {groups.map((group, i) => (
          <div key={group.label ?? `ungrouped-${i}`} className="flex shrink-0 gap-1 sm:contents">
            {i > 0 && (
              // A vertical rule between horizontally-scrolling pills on
              // mobile; a horizontal one above the group on desktop — same
              // element, no separate mobile/desktop markup.
              <div className="w-px shrink-0 bg-neutral-800 sm:my-1 sm:h-px sm:w-full" aria-hidden />
            )}
            {group.label && (
              <div className="hidden shrink-0 px-3 pt-3 pb-1 text-[10px] font-semibold tracking-wide text-neutral-500 uppercase sm:block">
                {group.label}
              </div>
            )}
            {group.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="whitespace-nowrap rounded-md px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-900 hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
