import Image from "next/image";
import Link from "next/link";
import { tmdbImageUrl } from "@/lib/tmdb";
import type { Person } from "@/generated/prisma/client";

export type ActorCardData = Pick<Person, "id" | "name" | "profilePath">;

export function ActorCard({ actor }: { actor: ActorCardData }) {
  const imageUrl = tmdbImageUrl(actor.profilePath, "w200");

  return (
    <Link href={`/actors/${actor.id}`} className="group flex w-28 shrink-0 flex-col items-center gap-2 text-center sm:w-32">
      <div className="relative aspect-square w-full overflow-hidden rounded-full bg-neutral-800">
        {imageUrl && (
          <Image
            src={imageUrl}
            alt={actor.name}
            fill
            sizes="128px"
            className="object-cover transition group-hover:scale-105"
          />
        )}
      </div>
      <p className="truncate text-sm font-medium text-neutral-100 group-hover:text-red-500">{actor.name}</p>
    </Link>
  );
}
