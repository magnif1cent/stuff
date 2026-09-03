import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getLineageTree } from "@/lib/lineage";
import { LineagePersonChip } from "@/components/lineage-person-chip";
import { tmdbImageUrl } from "@/lib/tmdb";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ personId: string }>;
}): Promise<Metadata> {
  const { personId } = await params;
  const tree = await getLineageTree(personId, { up: 0, down: 0 });
  if (!tree) return {};
  return { title: `${tree.center.name} — Lineage` };
}

// A deeper, un-collapsed view than the compact card on the actor page --
// this page IS the "show more" destination, so there's no further level to
// hide behind. Every node links to its own /lineage page, so clicking
// through the tree re-centers it via a normal navigation (no client JS
// needed for that -- unlike the admin tree, this page is read-only).
const DEFAULT_UP = 3;
const DEFAULT_DOWN = 3;

export default async function ActorLineagePage({
  params,
  searchParams,
}: {
  params: Promise<{ personId: string }>;
  searchParams: Promise<{ up?: string; down?: string }>;
}) {
  const { personId } = await params;
  const { up: upParam, down: downParam } = await searchParams;
  const up = Number(upParam) || DEFAULT_UP;
  const down = Number(downParam) || DEFAULT_DOWN;
  const tree = await getLineageTree(personId, { up, down, siblingLimit: 8 });
  if (!tree) {
    notFound();
  }

  const nodeHref = (id: string) => `/actors/${id}/lineage`;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10">
      <Link href={`/actors/${tree.center.id}`} className="mb-6 inline-block text-sm text-neutral-400 hover:text-white">
        &larr; Back to {tree.center.name}
      </Link>

      <h1 className="mb-1 text-2xl font-bold text-white">{tree.center.name}&rsquo;s Lineage</h1>
      <p className="mb-8 text-sm text-neutral-500">Sifus trace upward, students trace downward.</p>

      <div className="flex flex-col items-center gap-3">
        {tree.ancestorsTruncated && (
          <Link
            href={`/actors/${tree.center.id}/lineage?up=${up + 3}&down=${down}`}
            className="text-xs text-neutral-500 hover:text-neutral-300"
          >
            &hellip; show earlier generations
          </Link>
        )}

        {[...tree.ancestors].reverse().map((ancestor) => (
          <div key={ancestor.id} className="flex flex-col items-center gap-2">
            <LineagePersonChip person={ancestor} size={44} href={nodeHref(ancestor.id)} />
            <span className="text-neutral-700">&darr;</span>
          </div>
        ))}

        {tree.secondarySifus.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-neutral-500">
            Co-sifu:
            {tree.secondarySifus.map((s) => (
              <span key={s.id} className="rounded-full border border-dashed border-neutral-700 px-2.5 py-1">
                <LineagePersonChip person={s} size={20} href={nodeHref(s.id)} />
              </span>
            ))}
          </div>
        )}

        <div className="flex flex-col items-center gap-1 rounded-md border-2 border-red-600 bg-red-950/60 px-5 py-3 text-center">
          <span className="relative mb-1 block h-12 w-12 overflow-hidden rounded-full bg-neutral-800">
            {tree.center.profilePath && (
              <Image
                src={tmdbImageUrl(tree.center.profilePath, "w200") ?? ""}
                alt=""
                fill
                unoptimized
                sizes="48px"
                className="object-cover"
              />
            )}
          </span>
          <span className="text-base font-semibold text-white">{tree.center.name}</span>
        </div>

        {tree.descendantLevels.map((groups, levelIndex) => (
          <div key={levelIndex} className="flex flex-col items-center gap-2">
            <span className="text-neutral-700">&darr;</span>
            <div className="flex flex-wrap justify-center gap-x-8 gap-y-3">
              {groups.map((group) => (
                <div key={group.parent.id} className="flex flex-wrap justify-center gap-4">
                  {group.children.map((child) => (
                    <LineagePersonChip key={child.id} person={child} size={40} href={nodeHref(child.id)} />
                  ))}
                  {group.overflowCount > 0 && (
                    <span className="flex h-10 items-center rounded-full border-2 border-dashed border-neutral-700 px-3 text-xs text-neutral-500">
                      +{group.overflowCount} more
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {tree.descendantsTruncated && (
          <Link
            href={`/actors/${tree.center.id}/lineage?up=${up}&down=${down + 3}`}
            className="text-xs text-neutral-500 hover:text-neutral-300"
          >
            show more generations &hellip;
          </Link>
        )}

        {tree.ancestors.length === 0 && tree.secondarySifus.length === 0 && tree.descendantLevels.length === 0 && (
          <p className="mt-4 text-sm text-neutral-500">No lineage recorded for {tree.center.name} yet.</p>
        )}
      </div>
    </div>
  );
}
