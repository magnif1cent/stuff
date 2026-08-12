import Link from "next/link";

export function NewsTeaser({ title }: { title: string }) {
  return (
    <Link
      href="/news"
      className="block border-b border-neutral-800 bg-neutral-900/60 px-4 py-3 hover:bg-neutral-900"
    >
      <div className="mx-auto flex max-w-6xl items-center gap-3 text-sm">
        <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-red-500">Latest Update</span>
        <span className="truncate font-serif font-bold text-white">{title}</span>
        <span className="ml-auto shrink-0 text-xs text-neutral-500">Read more →</span>
      </div>
    </Link>
  );
}
