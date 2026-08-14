import Link from "next/link";

// Text mark until the real logo image is dropped in — swap the content
// below for an <Image> and this stays the only place that needs to change.
export function Logo() {
  return (
    <Link
      href="/"
      className="flex shrink-0 items-center whitespace-nowrap font-serif text-lg font-bold tracking-tight text-red-600"
    >
      師父<span className="text-white">Kung Fu Sauce</span>
    </Link>
  );
}
