import type { DescendantGroup, LineageFigureRef, LineageTree } from "@/lib/lineage";

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
// earlier flexbox-and-arrows rendering, and for why the descendant side
// was rewritten again to size each branch by its full subtree width
// instead of nudging one level at a time.
//
// A parent with more than one child/overflow slot connects via an elbow
// (a vertical stem, a shared horizontal bar, then an even vertical drop
// into each child) rather than a diagonal line straight from the parent to
// each child -- see DECISIONS.md. Secondary "co-sifu" links and the
// ancestor chain are unaffected: the ancestor chain never branches, and a
// secondary link stays a plain diagonal on purpose (its dashed diagonal is
// what visually marks it as not a primary descendant edge).

export const SLOT_W = 78;
export const ROW_H = 108;
export const PAD_X = 56;
export const PAD_Y = 52;

export interface LayoutNode {
  id: string;
  figure: LineageFigureRef;
  kind: "ancestor" | "secondary" | "center" | "child" | "overflow";
  x: number;
  y: number;
  overflowCount?: number;
  // Which sibling-limit query param an overflow badge's "+N more" link
  // should bump -- a group's own children are capped separately (a larger
  // limit, since a team can run much bigger than one person's students),
  // so which one applies depends on whether this overflow's parent is a
  // group, not on the overflow node itself.
  overflowParentIsGroup?: boolean;
}
export interface LayoutLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  dashed: boolean;
  // Whether this segment is the one that actually reaches a node (and so
  // should carry the arrowhead marker) -- false for the stem/bar segments
  // of an elbow connector, which are purely intermediate.
  arrowhead: boolean;
}

export function buildLayout(tree: LineageTree) {
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
    lines.push({ x1: from.x, y1: from.y, x2: to.x, y2: to.y, dashed: false, arrowhead: true });
  }
  if (A > 0) {
    lines.push({ x1: 0, y1: -ROW_H, x2: 0, y2: 0, dashed: false, arrowhead: true });
  }

  const secondaryRowY = A > 0 ? -ROW_H : -ROW_H;
  tree.secondarySifus.forEach((figure, i) => {
    const x = (i + 1) * SLOT_W;
    nodes.push({ id: figure.id, figure, kind: "secondary", x, y: secondaryRowY });
    posById.set(figure.id, { x, y: secondaryRowY });
    lines.push({ x1: x, y1: secondaryRowY, x2: 0, y2: 0, dashed: true, arrowhead: true });
  });

  nodes.push({ id: tree.center.id, figure: tree.center, kind: "center", x: 0, y: 0 });
  posById.set(tree.center.id, { x: 0, y: 0 });

  // Every branch below the center is sized by its *own subtree's* full
  // width, computed bottom-up, before any descendant is positioned --
  // not just by how many immediate children the level directly above has.
  // Sizing level-by-level from immediate child counts alone (the previous
  // approach: center each parent's row directly under it, then nudge a
  // later cluster right just far enough to clear the immediately
  // preceding one) under-reserves a wide branch's width two levels down:
  // it leaves just enough room for a neighboring sibling's own children,
  // but that sibling's own grandchildren can still land in (or past) the
  // wide branch's column, reading as descendants of the wrong person --
  // and the neighboring parent's own connector, still drawn from its real
  // (unmoved) position to its shifted-away children, can end up with a
  // gap between its stem and its own elbow bar. Reserving the full
  // subtree width up front means a parent is always exactly centered over
  // its own children and never shares a column with an unrelated node.
  const groupByParentAtLevel = new Map<string, DescendantGroup>();
  tree.descendantLevels.forEach((groups, levelIndex) => {
    for (const group of groups) groupByParentAtLevel.set(`${levelIndex}:${group.parent.id}`, group);
  });

  const widthCache = new Map<string, number>();
  function subtreeWidth(nodeId: string, levelIndex: number): number {
    const key = `${levelIndex}:${nodeId}`;
    const cached = widthCache.get(key);
    if (cached !== undefined) return cached;
    const group = groupByParentAtLevel.get(key);
    let width = 1;
    if (group) {
      width = group.children.reduce((sum, child) => sum + subtreeWidth(child.id, levelIndex + 1), 0);
      if (group.overflowCount > 0) width += 1;
      width = Math.max(width, 1);
    }
    widthCache.set(key, width);
    return width;
  }

  function layoutChildren(parentId: string, levelIndex: number, parentX: number, parentY: number) {
    const group = groupByParentAtLevel.get(`${levelIndex}:${parentId}`);
    if (!group) return;

    const childWidths = group.children.map((child) => subtreeWidth(child.id, levelIndex + 1));
    const totalWidth = childWidths.reduce((a, b) => a + b, 0) + (group.overflowCount > 0 ? 1 : 0);
    const y = parentY + ROW_H;
    let cursor = parentX - (totalWidth / 2) * SLOT_W;
    const drops: { x: number; y: number; dashed: boolean }[] = [];

    group.children.forEach((child, i) => {
      const w = childWidths[i];
      const x = cursor + (w / 2) * SLOT_W;
      cursor += w * SLOT_W;
      nodes.push({ id: child.id, figure: child, kind: "child", x, y });
      posById.set(child.id, { x, y });
      drops.push({ x, y, dashed: false });
    });
    if (group.overflowCount > 0) {
      const x = cursor + SLOT_W / 2;
      nodes.push({
        id: `${parentId}-overflow`,
        figure: { id: "", name: `+${group.overflowCount} more`, profilePath: null, personId: null, isGroup: false },
        kind: "overflow",
        x,
        y,
        overflowCount: group.overflowCount,
        overflowParentIsGroup: group.parent.isGroup,
      });
      drops.push({ x, y, dashed: true });
    }

    if (drops.length === 1) {
      // The common case (a single child, no overflow) already lands
      // exactly under the parent, so a plain line is already a straight
      // vertical drop -- no elbow needed.
      const drop = drops[0];
      lines.push({ x1: parentX, y1: parentY, x2: drop.x, y2: drop.y, dashed: drop.dashed, arrowhead: true });
    } else if (drops.length > 1) {
      const elbowY = parentY + ROW_H / 2;
      const dropXs = drops.map((d) => d.x);
      lines.push({ x1: parentX, y1: parentY, x2: parentX, y2: elbowY, dashed: false, arrowhead: false });
      lines.push({
        x1: Math.min(...dropXs),
        y1: elbowY,
        x2: Math.max(...dropXs),
        y2: elbowY,
        dashed: false,
        arrowhead: false,
      });
      for (const drop of drops) {
        lines.push({ x1: drop.x, y1: elbowY, x2: drop.x, y2: drop.y, dashed: drop.dashed, arrowhead: true });
      }
    }

    group.children.forEach((child) => layoutChildren(child.id, levelIndex + 1, posById.get(child.id)!.x, y));
  }

  layoutChildren(tree.center.id, 0, 0, 0);

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
      arrowhead: l.arrowhead,
    })),
  };
}
