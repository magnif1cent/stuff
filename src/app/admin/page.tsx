import Link from "next/link";
import { auth } from "@/lib/auth";

const SECTIONS = [
  {
    href: "/admin/movies",
    title: "Movies",
    description: "Browse the catalog and permanently delete a movie entry.",
    adminOnly: false,
  },
  {
    href: "/admin/import",
    title: "Import from TMDB",
    description: "Search TMDB and pull new films into the catalog.",
    adminOnly: true,
  },
  {
    href: "/admin/fight-scene-tags",
    title: "Fight Scene Tags",
    description: "Manage the category vocabulary members tag fight scenes with.",
    adminOnly: false,
  },
  {
    href: "/admin/forum-categories",
    title: "Forum Boards",
    description: "Manage the community forum's boards.",
    adminOnly: false,
  },
  {
    href: "/admin/news",
    title: "News & Updates",
    description: "Publish posts shown on /news and as a homepage teaser.",
    adminOnly: true,
  },
  {
    href: "/admin/account",
    title: "Account",
    description: "Change your own sign-in email or password.",
    adminOnly: false,
  },
];

export default async function AdminDashboardPage() {
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";
  const sections = SECTIONS.filter((section) => isAdmin || !section.adminOnly);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-white">Admin</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {sections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="rounded-md border border-neutral-800 bg-neutral-900 p-4 hover:border-neutral-700"
          >
            <h2 className="mb-1 text-sm font-semibold text-white">{section.title}</h2>
            <p className="text-xs text-neutral-400">{section.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
