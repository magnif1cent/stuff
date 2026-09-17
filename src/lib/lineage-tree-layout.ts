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
// was rewritten again (twice) to compare each branch's own row-by-row
// "contour" against its neighbors instead of nudging one level at a time
// or reserving a flat width per branch.
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

  // Every branch below the center reserves only as much horizontal room as
  // its own shape actually needs, compared row-by-row (a "contour") against
  // its neighbors -- not a flat width based on total descendant count. An
  // earlier version of this sized each branch by its full leaf count
  // (3 students reserves 3 slots, no matter how deep), which does stop a
  // wide branch's grandchild from landing on a neighboring parent's own
  // column, but it also reserves that same width at *every* row the branch
  // spans -- so a childless sibling standing next to a branch with deep
  // students still gets pushed as far away as that branch's *widest* row,
  // even though nothing of the sibling's own is anywhere near that row to
  // collide with. That reads as much more sprawled/uneven than the tree
  // actually needs to be. Comparing contours instead only requires
  // clearance at rows where two branches actually have something in them,
  // so a leaf sibling can sit right next to a deep branch's own head and
  // let that branch's grandchildren spread out underneath, while two
  // branches that really do get wide at the same depth still end up
  // properly separated -- see DECISIONS.md.
  const groupByParentAtLevel = new Map<string, DescendantGroup>();
  tree.descendantLevels.forEach((groups, levelIndex) => {
    for (const group of groups) groupByParentAtLevel.set(`${levelIndex}:${group.parent.id}`, group);
  });

  // A subtree's "profile" is its horizontal extent at each depth relative
  // to its own root (depth 0 = the root itself, always [0, 0]), after its
  // own children have already been packed against each other. `offsets`
  // gives each direct child's (and the overflow badge's, if any) x
  // relative to this subtree's root, already centered so the root sits at
  // the mean of its direct children's own positions.
  interface Subtree {
    offsets: Map<string, number>;
    overflowOffset: number | null;
    profile: [number, number][];
  }
  const subtreeCache = new Map<string, Subtree>();

  function computeSubtree(nodeId: string, levelIndex: number): Subtree {
    const key = `${levelIndex}:${nodeId}`;
    const cached = subtreeCache.get(key);
    if (cached) return cached;

    const group = groupByParentAtLevel.get(key);
    if (!group) {
      const leaf: Subtree = { offsets: new Map(), overflowOffset: null, profile: [[0, 0]] };
      subtreeCache.set(key, leaf);
      return leaf;
    }

    const childSubtrees = group.children.map((child) => computeSubtree(child.id, levelIndex + 1));
    const offsets = new Map<string, number>();
    const unionProfile: [number, number][] = [];

    // Merge a subtree's own profile (shifted by where it's about to be
    // placed) into the running union of everything already placed to its
    // left -- this is what the next sibling's placement gets compared
    // against, one row at a time.
    const mergeIntoUnion = (dx: number, profile: [number, number][]) => {
      profile.forEach(([min, max], depth) => {
        const parentDepth = depth + 1;
        const shifted: [number, number] = [min + dx, max + dx];
        const existing = unionProfile[parentDepth];
        unionProfile[parentDepth] = existing
          ? [Math.min(existing[0], shifted[0]), Math.max(existing[1], shifted[1])]
          : shifted;
      });
    };

    // The minimum dx that clears every row where this profile and the
    // union-so-far both have something, with at least one slot of buffer.
    const minClearance = (profile: [number, number][]) => {
      let required = -Infinity;
      profile.forEach(([min], depth) => {
        const existing = unionProfile[depth + 1];
        if (existing) required = Math.max(required, existing[1] + SLOT_W - min);
      });
      return required;
    };

    let cursor = 0;
    group.children.forEach((child, i) => {
      const sub = childSubtrees[i];
      const dx = i === 0 ? 0 : Math.max(minClearance(sub.profile), cursor);
      offsets.set(child.id, dx);
      mergeIntoUnion(dx, sub.profile);
      cursor = dx + SLOT_W;
    });

    let overflowOffset: number | null = null;
    if (group.overflowCount > 0) {
      const leafProfile: [number, number][] = [[0, 0]];
      const dx = group.children.length === 0 ? 0 : Math.max(minClearance(leafProfile), cursor);
      overflowOffset = dx;
      mergeIntoUnion(dx, leafProfile);
    }

    // Center this parent over the mean of its own direct children/overflow
    // positions (not their full subtree extents), then rebase everything
    // -- offsets, the overflow slot, and the merged profile -- so the
    // parent itself sits at relative x=0.
    const allOffsets = [...offsets.values(), ...(overflowOffset !== null ? [overflowOffset] : [])];
    const center = allOffsets.length > 0 ? (Math.min(...allOffsets) + Math.max(...allOffsets)) / 2 : 0;

    const rebasedOffsets = new Map([...offsets].map(([id, dx]) => [id, dx - center]));
    const rebasedOverflow = overflowOffset === null ? null : overflowOffset - center;
    const profile: [number, number][] = [[0, 0]];
    unionProfile.forEach((extent, depth) => {
      if (depth === 0 || !extent) return;
      profile[depth] = [extent[0] - center, extent[1] - center];
    });

    const result: Subtree = { offsets: rebasedOffsets, overflowOffset: rebasedOverflow, profile };
    subtreeCache.set(key, result);
    return result;
  }

  function layoutChildren(parentId: string, levelIndex: number, parentX: number, parentY: number) {
    const group = groupByParentAtLevel.get(`${levelIndex}:${parentId}`);
    if (!group) return;

    const { offsets, overflowOffset } = computeSubtree(parentId, levelIndex);
    const y = parentY + ROW_H;
    const drops: { x: number; y: number; dashed: boolean }[] = [];

    group.children.forEach((child) => {
      const x = parentX + offsets.get(child.id)!;
      nodes.push({ id: child.id, figure: child, kind: "child", x, y });
      posById.set(child.id, { x, y });
      drops.push({ x, y, dashed: false });
    });
    if (group.overflowCount > 0 && overflowOffset !== null) {
      const x = parentX + overflowOffset;
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
