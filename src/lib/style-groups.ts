// Split out of fight-scenes.ts (which imports the prisma client) so a client
// component can import this pure logic without pulling prisma into the
// browser bundle — same reasoning as the timeline.ts/timeline-layout.ts
// split (see DECISIONS.md).

type StyleWithGroupName = { id: string; name: string; group: { name: string } | null };

// Clusters styles by their optional FightStyleGroup for display, assuming
// the caller already queried/sorted them by group name then style name (see
// compareStylesByGroup below for the client-side equivalent) so same-group
// styles are contiguous — this just walks that list and buckets consecutive
// runs. Ungrouped styles land in one run with a null label, same as any
// other group; the caller decides whether a null label gets an "Other"
// heading or no heading at all. When every style shares one bucket (no
// groups configured yet, or exactly one), there's nothing to cluster, so
// this returns a single group and callers can skip rendering headers
// entirely.
export function groupStylesByCategory<T extends StyleWithGroupName>(
  styles: T[],
): { label: string | null; styles: T[] }[] {
  const buckets: { label: string | null; styles: T[] }[] = [];
  for (const style of styles) {
    const label = style.group?.name ?? null;
    const current = buckets[buckets.length - 1];
    if (current && current.label === label) {
      current.styles.push(style);
    } else {
      buckets.push({ label, styles: [style] });
    }
  }
  return buckets;
}

// Group name ascending (ungrouped last), then style name ascending — the
// ordering groupStylesByCategory assumes. Used server-side as a Prisma
// orderBy equivalent isn't available everywhere (e.g. after a client-side
// optimistic update), and client-side after every mutation in the admin
// style list so re-sorting stays consistent with the initial server render.
export function compareStylesByGroup(a: StyleWithGroupName, b: StyleWithGroupName): number {
  const aGroup = a.group?.name ?? null;
  const bGroup = b.group?.name ?? null;
  if (aGroup !== bGroup) {
    if (aGroup === null) return 1;
    if (bGroup === null) return -1;
    return aGroup.localeCompare(bGroup);
  }
  return a.name.localeCompare(b.name);
}
