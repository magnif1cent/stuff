import Link from "next/link";
import { LineagePersonChip } from "@/components/lineage-person-chip";
import type { LineageTree } from "@/lib/lineage";

// Same footing as the Details/Sparring Partner boxes on the actor page: a
// small neutral card, only rendered when there's something to show (no
// sifu and no students recorded yet -- same "no signal, no row" rule those
// two already follow).
export function ActorLineageCard({ tree }: { tree: LineageTree }) {
  const directSifu = tree.ancestors[0] ?? null;
  const directStudents = tree.descendantLevels[0]?.[0]?.children ?? [];
  if (!directSifu && tree.secondarySifus.length === 0 && directStudents.length === 0) {
    return null;
  }

  return (
    <div className="w-56 shrink-0 rounded-md border border-neutral-800 bg-neutral-900 p-4">
      <h3 className="text-[11px] font-semibold tracking-wide text-neutral-500 uppercase">Lineage</h3>

      {directSifu && (
        <div className="mt-2.5">
          <p className="mb-1 text-[11px] text-neutral-500">Sifu</p>
          <LineagePersonChip person={directSifu} size={20} />
        </div>
      )}
      {tree.secondarySifus.map((sifu) => (
        <div key={sifu.id} className="mt-1.5">
          <LineagePersonChip person={sifu} size={20} />
        </div>
      ))}

      {directStudents.length > 0 && (
        <div className="mt-2.5">
          <p className="mb-1 text-[11px] text-neutral-500">
            Student{directStudents.length === 1 ? "" : "s"}
          </p>
          <div className="flex flex-col gap-1.5">
            {directStudents.map((student) => (
              <LineagePersonChip key={student.id} person={student} size={20} />
            ))}
          </div>
        </div>
      )}

      <Link
        href={`/actors/${tree.center.id}/lineage`}
        className="mt-3 block text-xs font-semibold text-red-500 hover:text-red-400"
      >
        View full lineage &rarr;
      </Link>
    </div>
  );
}
