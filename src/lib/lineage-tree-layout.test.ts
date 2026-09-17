import { describe, expect, it } from "vitest";
import { buildLayout, SLOT_W } from "@/lib/lineage-tree-layout";
import type { LineageFigureRef, LineageTree } from "@/lib/lineage";

function fig(id: string): LineageFigureRef {
  return { id, name: id, profilePath: null, personId: null, isGroup: false };
}

function baseTree(overrides: Partial<LineageTree>): LineageTree {
  return {
    center: fig("center"),
    ancestors: [],
    ancestorsTruncated: false,
    secondarySifus: [],
    descendantLevels: [],
    descendantsTruncated: false,
    ...overrides,
  };
}

// Regression test for the exact shape reported as a bug: a sifu (Lau Cham)
// with more children than his sibling (Chiu Kao) caused Chiu Kao's own
// sibling column to land exactly on top of one of Lau Cham's children --
// making an unrelated figure (Lau Kar-Wing) look like Chiu Kao's student --
// and left a gap between Chiu Kao's connector stem and its own elbow bar.
describe("buildLayout", () => {
  it("never places two same-row nodes from different branches at the same x", () => {
    const tree = baseTree({
      center: fig("LamSaiWing"),
      descendantLevels: [
        [{ parent: fig("LamSaiWing"), children: [fig("LauCham"), fig("ChiuKao")], overflowCount: 0 }],
        [
          {
            parent: fig("LauCham"),
            children: [fig("LauKarLeung"), fig("GordonLiu"), fig("LauKarWing")],
            overflowCount: 0,
          },
          { parent: fig("ChiuKao"), children: [fig("ChiuChiLing"), fig("ChiuWai")], overflowCount: 0 },
        ],
      ],
    });

    const { nodes } = buildLayout(tree);
    const byRow = new Map<number, number[]>();
    for (const node of nodes) {
      const xs = byRow.get(node.y) ?? [];
      xs.push(node.x);
      byRow.set(node.y, xs);
    }
    for (const xs of byRow.values()) {
      expect(new Set(xs).size).toBe(xs.length);
    }

    const chiuKao = nodes.find((n) => n.id === "ChiuKao")!;
    const lauKarWing = nodes.find((n) => n.id === "LauKarWing")!;
    expect(Math.abs(chiuKao.x - lauKarWing.x)).toBeGreaterThanOrEqual(SLOT_W);
  });

  it("keeps every multi-child parent horizontally within the span of its own children (no gap between an elbow's stem and its own bar)", () => {
    const groups: { parentId: string; childIds: string[] }[] = [
      { parentId: "LamSaiWing", childIds: ["LauCham", "ChiuKao"] },
      { parentId: "LauCham", childIds: ["LauKarLeung", "GordonLiu", "LauKarWing"] },
      { parentId: "ChiuKao", childIds: ["ChiuChiLing", "ChiuWai"] },
    ];
    const tree = baseTree({
      center: fig("LamSaiWing"),
      descendantLevels: [
        [{ parent: fig("LamSaiWing"), children: [fig("LauCham"), fig("ChiuKao")], overflowCount: 0 }],
        [
          {
            parent: fig("LauCham"),
            children: [fig("LauKarLeung"), fig("GordonLiu"), fig("LauKarWing")],
            overflowCount: 0,
          },
          { parent: fig("ChiuKao"), children: [fig("ChiuChiLing"), fig("ChiuWai")], overflowCount: 0 },
        ],
      ],
    });

    const { nodes } = buildLayout(tree);
    const xById = new Map(nodes.map((n) => [n.id, n.x]));
    for (const group of groups) {
      const parentX = xById.get(group.parentId)!;
      const childXs = group.childIds.map((id) => xById.get(id)!);
      expect(parentX, `${group.parentId} should sit within its own children's span`).toBeGreaterThanOrEqual(
        Math.min(...childXs),
      );
      expect(parentX).toBeLessThanOrEqual(Math.max(...childXs));
    }
  });

  it("still centers an only child directly under its parent", () => {
    const tree = baseTree({
      descendantLevels: [[{ parent: fig("center"), children: [fig("onlyChild")], overflowCount: 0 }]],
    });
    const { nodes } = buildLayout(tree);
    const onlyChild = nodes.find((n) => n.id === "onlyChild")!;
    const center = nodes.find((n) => n.id === "center")!;
    expect(onlyChild.x).toBe(center.x);
  });
});
