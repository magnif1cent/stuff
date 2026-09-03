import Image from "next/image";
import Link from "next/link";
import { tmdbImageUrl } from "@/lib/tmdb";
import { getPortrayals, type LineageTree, type LineageFigureRef } from "@/lib/lineage";

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

// --- Layout ---------------------------------------------------------
//
// A hand-rolled layout, not a graph-layout library: this tree has exactly
// one branching shape to handle (a single primary chain above, a single
// primary chain of generations below, each level possibly fanning out to
// several children) rather than an arbitrary graph, so plain arithmetic
// covers it. Coordinates are computed in two passes -- first in
// trunk-centered "relative" units (x=0 is the primary sifu/student chain,
// row index counts generations away from the centered figure), then
// shifted once by the tree's actual min/max extent so nothing renders at a
// negative pixel position. See DECISIONS.md for why this replaced the
// earlier flexbox-and-arrows rendering.

const SLOT_W = 78;
const ROW_H = 108;
const PAD_X = 56;
const PAD_Y = 52;

interface LayoutNode {
  id: string;
  figure: LineageFigureRef;
  kind: "ancestor" | "secondary" | "center" | "child" | "overflow";
  x: number;
  y: number;
  overflowCount?: number;
}
interface LayoutLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  dashed: boolean;
}

function buildLayout(tree: LineageTree) {
  const nodes: LayoutNode[] = [];
  const lines: LayoutLine[] = [];
  const posById = new Map<string, { x: number; y: number }>();

  const ancestorsReversed = [...tree.ancestors].reverse(); // oldest first
  const A = ancestorsReversed.length;
  ancestorsReversed.forEach((figure, i) => {
    const row = -(A - i);
    const y = row * ROW_H;
    nodes.push({ id: figure.id, figure, kind: "ancestor", x: 0, y });
    posById.set(figure.id, { x: 0, y });
  });
  for (let i = 0; i < A - 1; i++) {
    const from = posById.get(ancestorsReversed[i].id)!;
    const to = posById.get(ancestorsReversed[i + 1].id)!;
    lines.push({ x1: from.x, y1: from.y, x2: to.x, y2: to.y, dashed: false });
  }
  if (A > 0) {
    lines.push({ x1: 0, y1: -ROW_H, x2: 0, y2: 0, dashed: false });
  }

  const secondaryRowY = A > 0 ? -ROW_H : -ROW_H;
  tree.secondarySifus.forEach((figure, i) => {
    const x = (i + 1) * SLOT_W;
    nodes.push({ id: figure.id, figure, kind: "secondary", x, y: secondaryRowY });
    posById.set(figure.id, { x, y: secondaryRowY });
    lines.push({ x1: x, y1: secondaryRowY, x2: 0, y2: 0, dashed: true });
  });

  nodes.push({ id: tree.center.id, figure: tree.center, kind: "center", x: 0, y: 0 });
  posById.set(tree.center.id, { x: 0, y: 0 });

  tree.descendantLevels.forEach((groups, levelIndex) => {
    const y = (levelIndex + 1) * ROW_H;
    const totalSlots = groups.reduce((sum, g) => sum + g.children.length + (g.overflowCount > 0 ? 1 : 0), 0);
    let slot = 0;
    for (const group of groups) {
      const parentPos = posById.get(group.parent.id) ?? { x: 0, y: y - ROW_H };
      for (const child of group.children) {
        const x = (slot - (totalSlots - 1) / 2) * SLOT_W;
        slot++;
        nodes.push({ id: child.id, figure: child, kind: "child", x, y });
        posById.set(child.id, { x, y });
        lines.push({ x1: parentPos.x, y1: parentPos.y, x2: x, y2: y, dashed: false });
      }
      if (group.overflowCount > 0) {
        const x = (slot - (totalSlots - 1) / 2) * SLOT_W;
        slot++;
        nodes.push({
          id: `${group.parent.id}-overflow`,
          figure: { id: "", name: `+${group.overflowCount} more`, profilePath: null, personId: null },
          kind: "overflow",
          x,
          y,
          overflowCount: group.overflowCount,
        });
        lines.push({ x1: parentPos.x, y1: parentPos.y, x2: x, y2: y, dashed: true });
      }
    }
  });

  const xs = nodes.map((n) => n.x);
  const ys = nodes.map((n) => n.y);
  const minX = Math.min(0, ...xs);
  const maxX = Math.max(0, ...xs);
  const minY = Math.min(0, ...ys);
  const maxY = Math.max(0, ...ys);
  const offsetX = -minX + PAD_X;
  const offsetY = -minY + PAD_Y;
  const width = maxX - minX + PAD_X * 2;
  const height = maxY - minY + PAD_Y * 2;

  return {
    width,
    height,
    nodes: nodes.map((n) => ({ ...n, x: n.x + offsetX, y: n.y + offsetY })),
    lines: lines.map((l) => ({
      x1: l.x1 + offsetX,
      y1: l.y1 + offsetY,
      x2: l.x2 + offsetX,
      y2: l.y2 + offsetY,
      dashed: l.dashed,
    })),
  };
}

// --- Rendering -------------------------------------------------------

const NODE_SIZE: Record<LayoutNode["kind"], number> = {
  ancestor: 52,
  secondary: 40,
  center: 64,
  child: 52,
  overflow: 40,
};

function TreeNode({ node }: { node: LayoutNode }) {
  const size = NODE_SIZE[node.kind];
  const isOverflow = node.kind === "overflow";
  const isCenter = node.kind === "center";
  const isSecondary = node.kind === "secondary";

  const circle = (
    <span
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold ${
        isCenter
          ? "border-[3px] border-red-600 bg-red-950 text-white shadow-[0_0_0_5px_rgba(212,56,44,0.18)]"
          : isOverflow
            ? "border-2 border-dashed border-neutral-700 bg-transparent text-neutral-500"
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
        <>
          {circle}
          <span className="text-[10px] text-neutral-500">more</span>
        </>
      ) : (
        <Link href={figureHref(node.figure)} className="flex flex-col items-center gap-1 hover:opacity-80">
          {circle}
          <span className={`text-xs leading-tight ${isCenter ? "font-semibold text-white" : "text-neutral-300"}`}>
            {node.figure.name}
          </span>
        </Link>
      )}
      {!isOverflow && <Portrayal figure={node.figure} />}
    </div>
  );
}

// Best-effort "played by" caption for bare figures (Ip Man, say) -- derived
// live from CastCredit.characterName, not stored anywhere (see
// getPortrayals in lib/lineage.ts for why: more than one actor can
// plausibly have played the same figure). Skipped for actor-linked figures,
// which already show their own real photo.
async function Portrayal({ figure }: { figure: LineageFigureRef }) {
  if (figure.personId || !figure.id) return null;
  const portrayals = await getPortrayals(figure.name);
  if (portrayals.length === 0) return null;
  return (
    <span className="text-[9px] leading-tight text-neutral-600">
      played by {portrayals.map((p) => p.person.name).join(", ")}
    </span>
  );
}

export async function LineageTreeBody({ tree, up, down }: { tree: LineageTree; up: number; down: number }) {
  const isEmpty = tree.ancestors.length === 0 && tree.secondarySifus.length === 0 && tree.descendantLevels.length === 0;
  const layout = buildLayout(tree);

  return (
    <div className="flex flex-col items-center gap-3">
      {tree.ancestorsTruncated && (
        <Link
          href={`${figureHref(tree.center)}?up=${up + 3}&down=${down}`}
          className="text-xs text-neutral-500 hover:text-neutral-300"
        >
          &hellip; show earlier generations
        </Link>
      )}

      <div className="max-w-full overflow-x-auto">
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
                markerEnd={line.dashed ? undefined : "url(#lineage-arrow)"}
              />
            ))}
          </svg>
          {layout.nodes.map((node) => (
            <TreeNode key={node.id} node={node} />
          ))}
        </div>
      </div>

      {tree.descendantsTruncated && (
        <Link
          href={`${figureHref(tree.center)}?up=${up}&down=${down + 3}`}
          className="text-xs text-neutral-500 hover:text-neutral-300"
        >
          show more generations &hellip;
        </Link>
      )}

      {isEmpty && <p className="mt-4 text-sm text-neutral-500">No lineage recorded for {tree.center.name} yet.</p>}
    </div>
  );
}
