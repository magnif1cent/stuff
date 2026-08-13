// Shared by rating-star-input.tsx (search-filter "X and up" picker) and
// rating-widget.tsx's category star picker — same star glyph, two different
// interaction semantics (filter threshold vs. exact score).
export const STAR_PATH =
  "M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.286-5.385a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z";

export function StarIcon({ fillPct, className = "h-6 w-6" }: { fillPct: number; className?: string }) {
  return (
    <span className={`relative block ${className}`}>
      <svg viewBox="0 0 24 24" className={`absolute inset-0 ${className} text-neutral-600`}>
        <path d={STAR_PATH} fill="none" stroke="currentColor" strokeWidth={1.5} />
      </svg>
      <span className="absolute inset-0 overflow-hidden" style={{ width: `${fillPct}%` }}>
        <svg viewBox="0 0 24 24" className={`${className} text-yellow-500`}>
          <path d={STAR_PATH} fill="currentColor" />
        </svg>
      </span>
    </span>
  );
}
