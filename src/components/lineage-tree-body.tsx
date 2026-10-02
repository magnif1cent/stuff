import Image from "next/image";
import Link from "next/link";
import { tmdbImageUrl } from "@/lib/tmdb";
import { getPortrayals, type LineageTree, type LineageFigureRef } from "@/lib/lineage";
import { buildLayout, type LayoutNode } from "@/lib/lineage-tree-layout";
import { GroupIcon } from "@/components/lineage-group-icon";
import { LineageTreeZoom } from "@/components/lineage-tree-zoom";

// A bare figure's own page (or CastCredit lookup for "portrayed by") is
// keyed by figureId; an actor-linked figure's is keyed by their personId --
// the public tree always re-centers through whichever is the figure's
// canonical URL, so admin edits and public browsing land on the same page.
function figureHref(figure: LineageFigureRef): string {
  return figure.personId ? `/actors/${figure.personId}/lineage` : `/lineage/${figure.id}`;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}

// --- Rendering -------------------------------------------------------

const NODE_SIZE: Record<LayoutNode["kind"], number> = {
  ancestor: 52,
  secondary: 40,
  center: 64,
  child: 52,
  overflow: 40,
};

function TreeNode({ node, marker, moreHref }: { node: LayoutNode; marker?: number; moreHref?: string }) {
  const size = NODE_SIZE[node.kind];
  const isOverflow = node.kind === "overflow";
  const isCenter = node.kind === "center";
  const isSecondary = node.kind === "secondary";
  const isGroup = !isOverflow && node.figure.isGroup;

  const circle = (
    <span
      className={`relative flex shrink-0 items-center justify-center overflow-hidden font-semibold ${
        isGroup ? "rounded-xl" : "rounded-full"
      } ${
        isCenter
          ? "border-[3px] border-red-600 bg-red-950 text-white shadow-[0_0_0_5px_rgba(212,56,44,0.18)]"
          : isOverflow
            ? "border-2 border-dashed border-neutral-700 bg-transparent text-neutral-500"
            : isGroup
              ? "border-2 border-amber-700 bg-amber-950/40 text-amber-600"
              : isSecondary
                ? "border-2 border-dashed border-neutral-600 bg-neutral-800 text-neutral-400"
                : "border-2 border-neutral-700 bg-neutral-800 text-neutral-400"
      }`}
      style={{ width: size, height: size, fontSize: isOverflow ? 11 : size / 2.8 }}
    >
      {isOverflow ? (
        `+${node.overflowCount}`
      ) : node.figure.profilePath ? (
        <Image
          src={tmdbImageUrl(node.figure.profilePath, "w200") ?? ""}
          alt=""
          fill
          unoptimized
          sizes={`${size}px`}
          className="object-cover"
        />
      ) : isGroup ? (
        <GroupIcon className="h-1/2 w-1/2" />
      ) : (
        initials(node.figure.name)
      )}
    </span>
  );

  return (
    <div
      className="absolute flex w-20 -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 text-center"
      style={{ left: node.x, top: node.y }}
    >
      {isOverflow ? (
        moreHref ? (
          <Link href={moreHref} className="flex flex-col items-center gap-1 hover:opacity-80">
            {circle}
            <span className="text-[10px] text-neutral-500 underline decoration-dotted">more</span>
          </Link>
        ) : (
          <>
            {circle}
            <span className="text-[10px] text-neutral-500">more</span>
          </>
        )
      ) : (
        <Link href={figureHref(node.figure)} className="flex flex-col items-center gap-1 hover:opacity-80">
          {circle}
          <span
            className={`bg-neutral-950 text-xs leading-tight ${isCenter ? "font-semibold text-white" : "text-neutral-300"}`}
          >
            {node.figure.name}
            {marker && <sup className="ml-0.5 text-[11px] font-bold text-neutral-500">{marker}</sup>}
          </span>
          {isCenter && isGroup && <span className="text-[9px] text-neutral-500 uppercase">Group</span>}
        </Link>
      )}
    </div>
  );
}

// A bare figure's own "played by" detail (see getPortrayals in
// lib/lineage.ts) doesn't render inline on the node -- its length varies
// with how much cast data a figure has, which made sibling nodes on the
// same row look uneven next to each other. Instead the node just gets a
// superscript marker, and every marker's detail is collected into one
// list below the whole tree, where there's no per-node column width to
// wrap inside of. See DECISIONS.md.
interface PortrayalEntry {
  marker: number;
  figureName: string;
  portrayals: Awaited<ReturnType<typeof getPortrayals>>;
}

async function resolvePortrayalMarkers(nodes: LayoutNode[]): Promise<{
  markerByNodeId: Map<string, number>;
  entries: PortrayalEntry[];
}> {
  const bareNodes = nodes.filter(
    (n) => n.kind !== "overflow" && n.figure.id && !n.figure.personId && !n.figure.isGroup,
  );
  const portrayalsByNodeId = new Map<string, Awaited<ReturnType<typeof getPortrayals>>>();
  await Promise.all(
    bareNodes.map(async (n) => {
      const portrayals = await getPortrayals([n.figure.name, ...n.figure.aliases]);
      if (portrayals.length > 0) portrayalsByNodeId.set(n.id, portrayals);
    }),
  );

  const markerByNodeId = new Map<string, number>();
  const entries: PortrayalEntry[] = [];
  for (const n of nodes) {
    const portrayals = portrayalsByNodeId.get(n.id);
    if (!portrayals) continue;
    const marker = entries.length + 1;
    markerByNodeId.set(n.id, marker);
    entries.push({ marker, figureName: n.figure.name, portrayals });
  }
  return { markerByNodeId, entries };
}

function PortrayalList({ entries }: { entries: PortrayalEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <div className="w-full max-w-lg border-t border-neutral-800 pt-3">
      <p className="mb-2 text-[10px] tracking-wide text-neutral-600 uppercase">Portrayed by</p>
      <div className="flex flex-col gap-1.5">
        {entries.map((entry) => (
          <p key={entry.marker} className="text-xs leading-relaxed text-neutral-500">
            <sup className="mr-1 text-[9px] font-bold text-neutral-500">{entry.marker}</sup>
            {entry.figureName} &mdash;{" "}
            {entry.portrayals.map((p, i) => (
              <span key={p.person.id}>
                {i > 0 && ", "}
                <Link
                  href={`/actors/${p.person.id}`}
                  className="text-neutral-400 underline decoration-dotted hover:text-neutral-200"
                >
                  {p.person.name}
                </Link>
                {p.years.length > 0 && <span> ({p.years.join(", ")})</span>}
              </span>
            ))}
          </p>
        ))}
      </div>
    </div>
  );
}

export async function LineageTreeBody({
  tree,
  up,
  down,
  siblings,
  groupSiblings,
  zoomable = false,
}: {
  tree: LineageTree;
  up: number;
  down: number;
  siblings: number;
  groupSiblings: number;
  // Pan/zoom is opt-in -- only the full-tree pages want it. The small
  // inline teaser on an actor's own page stays fixed-scale, embedded in
  // the page's normal scroll, same as before. See LineageTreeZoom.
  zoomable?: boolean;
}) {
  const isEmpty = tree.ancestors.length === 0 && tree.secondarySifus.length === 0 && tree.descendantLevels.length === 0;
  const layout = buildLayout(tree);
  const { markerByNodeId, entries } = await resolvePortrayalMarkers(layout.nodes);

  // Every link that re-centers/expands this same tree needs to carry all
  // four params forward, or expanding one (more generations, say) would
  // silently reset another (a sibling limit already bumped by an earlier
  // "+N more" click).
  const treeUrl = (overrides: { up?: number; down?: number; siblings?: number; groupSiblings?: number }) => {
    const params = { up, down, siblings, groupSiblings, ...overrides };
    return `${figureHref(tree.center)}?up=${params.up}&down=${params.down}&siblings=${params.siblings}&groupSiblings=${params.groupSiblings}`;
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {tree.ancestorsTruncated && (
        <Link href={treeUrl({ up: up + 3 })} className="text-xs text-neutral-500 hover:text-neutral-300">
          &hellip; show earlier generations
        </Link>
      )}

      {(() => {
        const treeSvg = (
          <div className="relative mx-auto" style={{ width: layout.width, height: layout.height }}>
            <svg
              className="absolute inset-0"
              width={layout.width}
              height={layout.height}
              viewBox={`0 0 ${layout.width} ${layout.height}`}
            >
              <defs>
                <marker id="lineage-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M0,0 L10,5 L0,10 Z" fill="#4d3a26" />
                </marker>
              </defs>
              {layout.lines.map((line, i) => (
                <line
                  key={i}
                  x1={line.x1}
                  y1={line.y1}
                  x2={line.x2}
                  y2={line.y2}
                  stroke="#4d3a26"
                  strokeWidth={2}
                  strokeDasharray={line.dashed ? "4 4" : undefined}
                  markerEnd={!line.dashed && line.arrowhead ? "url(#lineage-arrow)" : undefined}
                />
              ))}
            </svg>
            {layout.nodes.map((node) => (
              <TreeNode
                key={node.id}
                node={node}
                marker={markerByNodeId.get(node.id)}
                moreHref={
                  node.kind === "overflow"
                    ? treeUrl(
                        node.overflowParentIsGroup
                          ? { groupSiblings: groupSiblings + (node.overflowCount ?? 0) }
                          : { siblings: siblings + (node.overflowCount ?? 0) },
                      )
                    : undefined
                }
              />
            ))}
          </div>
        );
        return zoomable ? (
          <LineageTreeZoom width={layout.width} height={layout.height}>
            {treeSvg}
          </LineageTreeZoom>
        ) : (
          <div className="max-w-full overflow-x-auto">{treeSvg}</div>
        );
      })()}

      {tree.descendantsTruncated && (
        <Link href={treeUrl({ down: down + 3 })} className="text-xs text-neutral-500 hover:text-neutral-300">
          show more generations &hellip;
        </Link>
      )}

      <PortrayalList entries={entries} />

      {isEmpty && <p className="mt-4 text-sm text-neutral-500">No lineage recorded for {tree.center.name} yet.</p>}
    </div>
  );
}
