import Image from "next/image";
import Link from "next/link";
import { tmdbImageUrl } from "@/lib/tmdb";
import type { Collaborator } from "@/lib/collaborators";

const NODE_WIDTH = 84;

// Replaces the old single "Sparring Partner" card -- see DECISIONS.md. Drawn
// as a trunk line with the subject actor anchoring the left end and each
// collaborator hanging off it via a short tick, reusing the connecting-line
// visual language LineageTreeBody already established for "who is this
// person linked to" -- collaboration is the same kind of relational fact,
// just co-starring instead of training. The top-ranked collaborator's tick
// and avatar ring pick up the accent red, the same way Lineage distinguishes
// a confirmed line from a dashed one, except here it marks the strongest
// match rather than certainty.
//
// Every node links to the pairwise /with page rather than just another actor
// page, since the point of this section is the relationship, not just the
// person.
export function ActorCollaboratorsSection({
  person,
  collaborators,
}: {
  person: { id: string; name: string; profilePath: string | null };
  collaborators: Collaborator[];
}) {
  if (collaborators.length === 0) return null;

  return (
    <div className="mb-10">
      <h2 className="mb-4 text-xl font-bold text-white">Collaborators</h2>
      <div className="relative">
        <div className="absolute inset-x-0 top-8 z-0 h-0.5 bg-neutral-700" />
        <div className="rail-scrollbar flex items-start gap-6 overflow-x-auto pb-2">
          <div className="flex shrink-0 flex-col items-center text-center" style={{ width: NODE_WIDTH }}>
            <div className="relative z-10 h-16 w-16 shrink-0 overflow-hidden rounded-full bg-neutral-800">
              {person.profilePath && (
                <Image
                  src={tmdbImageUrl(person.profilePath, "w200") ?? ""}
                  alt={person.name}
                  fill
                  unoptimized
                  sizes="64px"
                  className="object-cover"
                />
              )}
            </div>
            <p className="mt-2 w-full truncate text-sm font-bold text-white">{person.name}</p>
            <p className="text-[10px] tracking-wide text-neutral-500 uppercase">this actor</p>
          </div>

          {collaborators.map((collaborator, i) => {
            const isTop = i === 0;
            const stat = [
              collaborator.sharedMovieCount > 0 &&
                `${collaborator.sharedMovieCount} movie${collaborator.sharedMovieCount === 1 ? "" : "s"}`,
              collaborator.sharedFightSceneCount > 0 &&
                `${collaborator.sharedFightSceneCount} fight${collaborator.sharedFightSceneCount === 1 ? "" : "s"}`,
            ]
              .filter(Boolean)
              .join(" · ");

            return (
              <Link
                key={collaborator.id}
                href={`/actors/${person.id}/with/${collaborator.id}`}
                className="group flex shrink-0 flex-col items-center pt-8 text-center"
                style={{ width: NODE_WIDTH }}
              >
                <div className={`h-2 w-0.5 ${isTop ? "bg-red-500" : "bg-neutral-700"}`} />
                <div
                  className={`relative z-10 h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-neutral-950 bg-neutral-800 ${
                    isTop ? "ring-2 ring-red-500" : ""
                  }`}
                >
                  {collaborator.profilePath && (
                    <Image
                      src={tmdbImageUrl(collaborator.profilePath, "w200") ?? ""}
                      alt={collaborator.name}
                      fill
                      unoptimized
                      sizes="48px"
                      className="object-cover"
                    />
                  )}
                </div>
                <p className="mt-2 w-full truncate text-sm font-medium text-neutral-100 italic group-hover:text-red-500">
                  {collaborator.name}
                </p>
                <p className={`text-[10px] ${isTop ? "text-red-500" : "text-neutral-500"}`}>{stat}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
