import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getFigureIdForPerson, getLineageTree } from "@/lib/lineage";
import { LineageTreeBody } from "@/components/lineage-tree-body";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ personId: string }>;
}): Promise<Metadata> {
  const { personId } = await params;
  const figureId = await getFigureIdForPerson(personId);
  if (!figureId) return {};
  const tree = await getLineageTree(figureId, { up: 0, down: 0 });
  if (!tree) return {};
  return { title: `${tree.center.name} — Lineage` };
}

const DEFAULT_UP = 3;
const DEFAULT_DOWN = 3;

// A deeper, un-collapsed view than the compact card on the actor page --
// this page IS the "show more" destination, so there's no further level to
// hide behind. Every node links to its own lineage page (an actor's here,
// a bare figure's at /lineage/[figureId]), so clicking through the tree
// re-centers it via a normal navigation (no client JS needed -- unlike the
// admin tree, this page is read-only).
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

  const figureId = await getFigureIdForPerson(personId);
  if (!figureId) {
    notFound();
  }
  const tree = await getLineageTree(figureId, { up, down, siblingLimit: 8 });
  if (!tree) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10">
      <Link href={`/actors/${personId}`} className="mb-6 inline-block text-sm text-neutral-400 hover:text-white">
        &larr; Back to {tree.center.name}
      </Link>

      <h1 className="mb-1 text-2xl font-bold text-white">{tree.center.name}&rsquo;s Lineage</h1>
      <p className="mb-8 text-sm text-neutral-500">Sifus trace upward, students trace downward.</p>

      <LineageTreeBody tree={tree} up={up} down={down} />
    </div>
  );
}
