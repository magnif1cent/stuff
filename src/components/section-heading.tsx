import Link from "next/link";

// A homepage section's title, with an optional "See all →" link on the
// right to the full page the section previews.
export function SectionHeading({ title, seeAllHref }: { title: string; seeAllHref?: string }) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-3">
      <h2 className="font-serif text-xl font-bold text-white">{title}</h2>
      {seeAllHref && (
        <Link href={seeAllHref} className="shrink-0 text-sm text-red-500 hover:underline">
          See all →
        </Link>
      )}
    </div>
  );
}
