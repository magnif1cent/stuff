import Link from "next/link";
import { pageNumbers } from "@/lib/pagination";

// Shared by every paginated list in the app (movie/fight search, a movie's
// Fights/Reviews, Lists, actor Tributes, News archive, a Timeline era) --
// previously each page duplicated its own "← Previous / Page X of Y / Next"
// block with no way to jump to a specific page. `buildHref` stays
// per-caller (each page's own filters/sort end up in the query string
// differently) rather than folding that into this component.
export function Pagination({
  page,
  totalPages,
  buildHref,
  label,
}: {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
  label?: string;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm">
      {page > 1 ? (
        <Link href={buildHref(page - 1)} className="text-red-500 hover:underline">
          ← Previous
        </Link>
      ) : (
        <span className="text-neutral-600">← Previous</span>
      )}

      <div className="flex items-center gap-1">
        {pageNumbers(page, totalPages).map((p, i) =>
          p === "ellipsis" ? (
            <span key={`ellipsis-${i}`} className="px-1 text-neutral-600">
              …
            </span>
          ) : p === page ? (
            <span
              key={p}
              aria-current="page"
              className="min-w-7 rounded px-2 py-1 text-center font-semibold text-white"
            >
              {p}
            </span>
          ) : (
            <Link
              key={p}
              href={buildHref(p)}
              className="min-w-7 rounded px-2 py-1 text-center text-neutral-400 hover:text-red-400"
            >
              {p}
            </Link>
          ),
        )}
      </div>

      {page < totalPages ? (
        <Link href={buildHref(page + 1)} className="text-red-500 hover:underline">
          Next →
        </Link>
      ) : (
        <span className="text-neutral-600">Next →</span>
      )}

      {label && <span className="text-neutral-500">({label})</span>}
    </div>
  );
}
