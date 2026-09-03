import Image from "next/image";
import Link from "next/link";
import { tmdbImageUrl } from "@/lib/tmdb";
import type { Collaborator } from "@/lib/collaborators";

// Replaces the old single "Sparring Partner" card -- see DECISIONS.md. Every
// row here links to the pairwise /with page rather than just another actor
// page, since the point of this section is the relationship, not just the
// person.
export function ActorCollaboratorsSection({
  personId,
  collaborators,
}: {
  personId: string;
  collaborators: Collaborator[];
}) {
  if (collaborators.length === 0) return null;

  return (
    <div className="mb-10">
      <h2 className="mb-4 text-xl font-bold text-white">Collaborators</h2>
      <div className="flex flex-wrap gap-4">
        {collaborators.map((collaborator) => (
          <Link
            key={collaborator.id}
            href={`/actors/${personId}/with/${collaborator.id}`}
            className="group flex w-40 flex-col items-center gap-2 rounded-md border border-neutral-800 bg-neutral-900 p-3 text-center hover:border-neutral-700"
          >
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-neutral-800">
              {collaborator.profilePath && (
                <Image
                  src={tmdbImageUrl(collaborator.profilePath, "w200") ?? ""}
                  alt={collaborator.name}
                  fill
                  unoptimized
                  sizes="64px"
                  className="object-cover"
                />
              )}
            </div>
            <p className="w-full truncate text-sm font-medium text-neutral-100 group-hover:text-red-500">
              {collaborator.name}
            </p>
            <p className="text-xs text-neutral-500">
              {[
                collaborator.sharedMovieCount > 0 &&
                  `${collaborator.sharedMovieCount} movie${collaborator.sharedMovieCount === 1 ? "" : "s"}`,
                collaborator.sharedFightSceneCount > 0 &&
                  `${collaborator.sharedFightSceneCount} fight${collaborator.sharedFightSceneCount === 1 ? "" : "s"}`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
