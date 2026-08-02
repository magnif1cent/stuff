import Link from "next/link";

const SECTIONS = [
  {
    href: "/admin/movies",
    title: "Movies",
    description: "Browse the catalog and permanently delete a movie entry.",
  },
  {
    href: "/admin/import",
    title: "Import from TMDB",
    description: "Search TMDB and pull new films into the catalog.",
  },
  {
    href: "/admin/fight-scene-tags",
    title: "Fight Scene Tags",
    description: "Manage the category vocabulary members tag fight scenes with.",
  },
  {
    href: "/admin/account",
    title: "Account",
    description: "Change your own admin sign-in email or password.",
  },
];

export default function AdminDashboardPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-white">Admin</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {SECTIONS.map((section) => (
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
