import Image from "next/image";
import Link from "next/link";
import { tmdbImageUrl } from "@/lib/tmdb";
import type { LineageFigureRef } from "@/lib/lineage";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}

export function LineagePersonChip({
  figure,
  size = 40,
  href,
}: {
  figure: LineageFigureRef;
  size?: number;
  // Defaults to the figure's own page -- the actor's profile when they're
  // an actor, otherwise their standalone /lineage/[figureId] page (a bare
  // figure has no actor page to send it to). The full lineage tree passes
  // the figure's *lineage* page explicitly either way, so clicking a node
  // re-centers the tree rather than navigating away to a profile.
  href?: string;
}) {
  const defaultHref = figure.personId ? `/actors/${figure.personId}` : `/lineage/${figure.id}`;
  return (
    <Link href={href ?? defaultHref} className="flex items-center gap-1.5 hover:text-red-500">
      <span
        className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-800 font-semibold text-neutral-500"
        style={{ width: size, height: size, fontSize: size / 2.6 }}
      >
        {figure.profilePath ? (
          <Image
            src={tmdbImageUrl(figure.profilePath, "w200") ?? ""}
            alt=""
            fill
            unoptimized
            sizes={`${size}px`}
            className="object-cover"
          />
        ) : (
          initials(figure.name)
        )}
      </span>
      <span className="truncate">{figure.name}</span>
    </Link>
  );
}
