import Link from "next/link";
import { BuildVersion } from "@/components/build-version";

export function Footer() {
  return (
    <footer className="flex items-center justify-between gap-4 border-t border-neutral-800 px-4 py-3">
      <div className="flex items-center gap-4">
        <Link href="/about" className="text-sm text-neutral-400 hover:text-white">
          About
        </Link>
        <Link href="/news" className="text-sm text-neutral-400 hover:text-white">
          News
        </Link>
        <Link href="/tops" className="text-sm text-neutral-400 hover:text-white">
          Top 100
        </Link>
      </div>
      <BuildVersion />
    </footer>
  );
}
