import Link from "next/link";

// Deliberately quiet (grey label, regular-weight title) so it doesn't compete
// with the tagline and the carousel's own red "Trending this week" label --
// see "Homepage first screen calmed" in DECISIONS.md.
export function NewsTeaser({ title }: { title: string }) {
  return (
    <Link
      href="/news"
      className="block border-b border-neutral-800 px-4 py-2.5 hover:bg-neutral-900 sm:py-3"
    >
      <div className="mx-auto flex max-w-6xl items-center gap-3 text-sm">
        <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-neutral-500">
          <span className="hidden sm:inline">Latest </span>Update
        </span>
        <span className="truncate text-neutral-300">{title}</span>
        <span className="ml-auto shrink-0 text-xs text-neutral-500">
          <span className="hidden sm:inline">Read more </span>→
        </span>
      </div>
    </Link>
  );
}
