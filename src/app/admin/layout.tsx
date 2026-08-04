import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/require-admin";

const NAV_LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/movies", label: "Movies" },
  { href: "/admin/import", label: "Import from TMDB" },
  { href: "/admin/fight-scene-tags", label: "Fight Scene Tags" },
  { href: "/admin/account", label: "Account" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdminSession();
  if (!session) {
    redirect("/");
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-10 sm:flex-row">
      <nav className="rail-scrollbar flex shrink-0 gap-1 overflow-x-auto sm:w-48 sm:flex-col sm:overflow-visible">
        {NAV_LINKS.map((link) => (
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
