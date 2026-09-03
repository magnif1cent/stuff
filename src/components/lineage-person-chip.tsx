import Image from "next/image";
import Link from "next/link";
import { tmdbImageUrl } from "@/lib/tmdb";
import type { LineagePersonRef } from "@/lib/lineage";

export function LineagePersonChip({
  person,
  size = 40,
  href,
}: {
  person: LineagePersonRef;
  size?: number;
  // Defaults to the actor's own page; the full lineage tree passes the
  // person's lineage page instead so clicking a node re-centers the tree.
  href?: string;
}) {
  return (
    <Link href={href ?? `/actors/${person.id}`} className="flex items-center gap-1.5 hover:text-red-500">
      <span
        className="relative shrink-0 overflow-hidden rounded-full bg-neutral-800"
        style={{ width: size, height: size }}
      >
        {person.profilePath && (
          <Image
            src={tmdbImageUrl(person.profilePath, "w200") ?? ""}
            alt=""
            fill
            unoptimized
            sizes={`${size}px`}
            className="object-cover"
          />
        )}
      </span>
      <span className="truncate">{person.name}</span>
    </Link>
  );
}
