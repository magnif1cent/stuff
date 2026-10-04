import Link from "next/link";

// Text mark until the real logo image is dropped in — swap the content
// below for an <Image> and this stays the only place that needs to change.
export function Logo() {
  return (
    <Link
      href="/"
      className="flex shrink-0 items-center whitespace-nowrap font-display text-2xl uppercase tracking-wide text-red-600"
    >
      Kung Fu Sauce
    </Link>
  );
}
