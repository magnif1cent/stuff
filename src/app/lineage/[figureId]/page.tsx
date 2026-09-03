import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getLineageTree } from "@/lib/lineage";
import { LineageTreeBody } from "@/components/lineage-tree-body";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ figureId: string }>;
}): Promise<Metadata> {
  const { figureId } = await params;
  const tree = await getLineageTree(figureId, { up: 0, down: 0 }).catch(() => null);
  if (!tree) return {};
  return { title: `${tree.center.name} — Lineage` };
}

const DEFAULT_UP = 3;
const DEFAULT_DOWN = 3;

// The lineage page for a figure with no actor page to live under -- a
// historical sifu never credited in a film, or a character like Ip Man
// (played by more than one actor across different films, so there's no
// single actor page that could canonically stand in for them). Reached by
// clicking a non-actor node while browsing a tree; an actor-linked figure's
// page is /actors/[personId]/lineage instead, which this redirects into if
// asked for one directly (see LineageTreeBody's figureHref).
export default async function LineageFigurePage({
  params,
  searchParams,
}: {
  params: Promise<{ figureId: string }>;
  searchParams: Promise<{ up?: string; down?: string }>;
}) {
  const { figureId } = await params;
  const { up: upParam, down: downParam } = await searchParams;
  const up = Number(upParam) || DEFAULT_UP;
  const down = Number(downParam) || DEFAULT_DOWN;

  const tree = await getLineageTree(figureId, { up, down, siblingLimit: 8 }).catch(() => null);
  if (!tree) {
    notFound();
  }
  // LineageTreeBody's figureHref never generates a link here for an
  // actor-linked figure, but redirect into the canonical URL anyway in
  // case someone lands here directly (a bookmark, a stale link).
  if (tree.center.personId) {
    redirect(`/actors/${tree.center.personId}/lineage?up=${up}&down=${down}`);
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10">
      <h1 className="mb-1 text-2xl font-bold text-white">{tree.center.name}&rsquo;s Lineage</h1>
      <p className="mb-8 text-sm text-neutral-500">
        Earlier generations appear above, later ones below. &ldquo;Lineage&rdquo; is our tribute to the martial
        artists who built this genre, generation by generation. Hand-curated, always a work in progress &mdash;
        reach out if you spot something to fix.
      </p>

      <LineageTreeBody tree={tree} up={up} down={down} />
    </div>
  );
}
