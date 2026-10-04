import { describe, expect, it } from "vitest";
import { groupStylesByCategory, compareStylesByGroup } from "@/lib/style-groups";

type Style = { id: string; name: string; group: { name: string } | null };

function style(id: string, name: string, groupName: string | null): Style {
  return { id, name, group: groupName ? { name: groupName } : null };
}

describe("groupStylesByCategory", () => {
  it("collapses to one bucket when no groups exist", () => {
    const styles = [style("1", "Drunken Boxing", null), style("2", "Muay Thai", null)];
    const buckets = groupStylesByCategory(styles);
    expect(buckets).toHaveLength(1);
    expect(buckets[0].label).toBeNull();
    expect(buckets[0].styles).toEqual(styles);
  });

  it("collapses to one bucket when every style shares the same single group", () => {
    const styles = [style("1", "Wing Chun", "Southern"), style("2", "Hung Ga", "Southern")];
    const buckets = groupStylesByCategory(styles);
    expect(buckets).toHaveLength(1);
    expect(buckets[0].label).toBe("Southern");
  });

  it("buckets consecutive same-group styles together, assuming group-then-name sorted input", () => {
    const styles = [
      style("1", "Bajiquan", "Northern"),
      style("2", "Changquan", "Northern"),
      style("3", "Hung Ga", "Southern"),
      style("4", "Wing Chun", "Southern"),
      style("5", "Drunken Boxing", null),
      style("6", "Muay Thai", null),
    ];
    const buckets = groupStylesByCategory(styles);
    expect(buckets.map((b) => b.label)).toEqual(["Northern", "Southern", null]);
    expect(buckets.map((b) => b.styles.map((s) => s.name))).toEqual([
      ["Bajiquan", "Changquan"],
      ["Hung Ga", "Wing Chun"],
      ["Drunken Boxing", "Muay Thai"],
    ]);
  });

  it("starts a new bucket if the same group name reappears non-consecutively (caller's sort broke)", () => {
    const styles = [style("1", "Bajiquan", "Northern"), style("2", "Hung Ga", "Southern"), style("3", "Changquan", "Northern")];
    const buckets = groupStylesByCategory(styles);
    expect(buckets.map((b) => b.label)).toEqual(["Northern", "Southern", "Northern"]);
  });

  it("returns an empty array for an empty input", () => {
    expect(groupStylesByCategory([])).toEqual([]);
  });
});

describe("compareStylesByGroup", () => {
  it("sorts by group name first, ungrouped styles last", () => {
    const styles = [
      style("1", "Drunken Boxing", null),
      style("2", "Wing Chun", "Southern"),
      style("3", "Bajiquan", "Northern"),
    ];
    const sorted = [...styles].sort(compareStylesByGroup);
    expect(sorted.map((s) => s.name)).toEqual(["Bajiquan", "Wing Chun", "Drunken Boxing"]);
  });

  it("sorts by style name within the same group", () => {
    const styles = [style("1", "Wing Chun", "Southern"), style("2", "Hung Ga", "Southern")];
    const sorted = [...styles].sort(compareStylesByGroup);
    expect(sorted.map((s) => s.name)).toEqual(["Hung Ga", "Wing Chun"]);
  });

  it("sorts multiple ungrouped styles by name among themselves", () => {
    const styles = [style("1", "Muay Thai", null), style("2", "Drunken Boxing", null)];
    const sorted = [...styles].sort(compareStylesByGroup);
    expect(sorted.map((s) => s.name)).toEqual(["Drunken Boxing", "Muay Thai"]);
  });

  it("combined with groupStylesByCategory produces contiguous, correctly ordered buckets", () => {
    const styles = [
      style("1", "Wing Chun", "Southern"),
      style("2", "Drunken Boxing", null),
      style("3", "Changquan", "Northern"),
      style("4", "Hung Ga", "Southern"),
      style("5", "Bajiquan", "Northern"),
    ];
    const sorted = [...styles].sort(compareStylesByGroup);
    const buckets = groupStylesByCategory(sorted);
    expect(buckets.map((b) => b.label)).toEqual(["Northern", "Southern", null]);
    expect(buckets.map((b) => b.styles.map((s) => s.name))).toEqual([
      ["Bajiquan", "Changquan"],
      ["Hung Ga", "Wing Chun"],
      ["Drunken Boxing"],
    ]);
  });
});
