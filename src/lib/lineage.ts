import { prisma } from "@/lib/prisma";
import { MAX_LINEAGE_NOTE_LENGTH, MAX_CHAIN_TEXT_LENGTH, MAX_FIGURE_NAME_LENGTH } from "@/lib/lineage-constants";

export { MAX_LINEAGE_NOTE_LENGTH, MAX_CHAIN_TEXT_LENGTH, MAX_FIGURE_NAME_LENGTH };
const DEFAULT_UP_GENERATIONS = 2;
const DEFAULT_DOWN_GENERATIONS = 2;
const DEFAULT_SIBLING_LIMIT = 6;
// A group (a stunt team, say) can run far larger than an individual's own
// roster of students, so it gets its own, more generous cap before the
// overflow badge kicks in -- see the per-parent limit in getLineageTree.
const DEFAULT_GROUP_SIBLING_LIMIT = 12;

// A lineage node. Not always an actor -- `personId`/`profilePath` are null
// for a bare figure (a historical sifu never credited in a film, or a
// character like Ip Man who's been played by more than one actor -- see
// DECISIONS.md and getPortrayals below). When a figure IS linked to a
// Person, its display name/photo always come from the Person record rather
// than the figure's own (possibly stale) `name` column. `isGroup` is always
// false for an actor-linked figure -- a collective isn't a single trained
// person.
export interface LineageFigureRef {
  id: string;
  name: string;
  profilePath: string | null;
  personId: string | null;
  isGroup: boolean;
}

interface PersonRef {
  id: string;
  name: string;
  profilePath: string | null;
}

export const figureSelect = {
  id: true,
  name: true,
  personId: true,
  isGroup: true,
  person: { select: { name: true, profilePath: true } },
} as const;

type FigureRow = {
  id: string;
  name: string;
  personId: string | null;
  isGroup: boolean;
  person: { name: string; profilePath: string | null } | null;
};

export function toFigureRef(row: FigureRow): LineageFigureRef {
  return {
    id: row.id,
    name: row.person?.name ?? row.name,
    profilePath: row.person?.profilePath ?? null,
    personId: row.personId,
    isGroup: row.isGroup,
  };
}

// --- Resolving a figure ------------------------------------------------

// Every actor is searchable for lineage purposes without needing a
// LineageFigure row to already exist -- one is created lazily, the moment
// they're actually linked (here), rather than up front for the whole
// catalog. Idempotent: calling this again for the same actor reuses their
// existing figure.
export async function resolveFigureForPerson(personId: string): Promise<LineageFigureRef | null> {
  const person = await prisma.person.findUnique({
    where: { id: personId },
    select: { id: true, name: true, profilePath: true },
  });
  if (!person) return null;
  const figure = await prisma.lineageFigure.upsert({
    where: { personId },
    update: {},
    create: { name: person.name, personId },
  });
  return { id: figure.id, name: person.name, profilePath: person.profilePath, personId: person.id, isGroup: false };
}

// Read-only counterpart of the above -- used where creating a figure on the
// fly would be wrong (browsing an actor's page shouldn't silently create
// lineage data for them just because they were looked at).
export async function getFigureIdForPerson(personId: string): Promise<string | null> {
  const figure = await prisma.lineageFigure.findUnique({ where: { personId }, select: { id: true } });
  return figure?.id ?? null;
}

// Bare (non-actor) figures are deduped by exact case-insensitive name so
// typing "Ip Man" twice reuses the same figure instead of forking the
// lineage in two. A name that already exists keeps its existing `isGroup`
// value rather than being silently flipped by whatever the caller passed
// this time -- that's a correction made explicitly, not a side effect of
// re-adding a name.
export async function createOrReuseBareFigure(
  name: string,
  isGroup = false,
): Promise<{ ok: true; figure: LineageFigureRef } | { ok: false; error: string }> {
  const trimmed = name.trim();
  if (!trimmed) {
    return { ok: false, error: "Name is required." };
  }
  if (trimmed.length > MAX_FIGURE_NAME_LENGTH) {
    return { ok: false, error: `Name must be ${MAX_FIGURE_NAME_LENGTH} characters or fewer.` };
  }
  const existing = await prisma.lineageFigure.findFirst({
    where: { personId: null, name: { equals: trimmed, mode: "insensitive" } },
  });
  const figure = existing ?? (await prisma.lineageFigure.create({ data: { name: trimmed, isGroup } }));
  return { ok: true, figure: { id: figure.id, name: figure.name, profilePath: null, personId: null, isGroup: figure.isGroup } };
}

// Flips `isGroup` on an already-created bare figure -- for correcting one
// added without the flag, without having to delete and recreate it (which
// would also mean re-adding every link already made to it). Actor-linked
// figures are never groups, so this refuses one with a personId rather than
// letting a caller put it in a nonsensical state.
export async function setFigureIsGroup(
  figureId: string,
  isGroup: boolean,
): Promise<{ ok: true; figure: LineageFigureRef } | { ok: false; error: string }> {
  const figure = await prisma.lineageFigure.findUnique({ where: { id: figureId } });
  if (!figure) {
    return { ok: false, error: "Figure not found." };
  }
  if (figure.personId) {
    return { ok: false, error: "An actor-linked figure can't be marked as a group." };
  }
  const updated = await prisma.lineageFigure.update({ where: { id: figureId }, data: { isGroup } });
  return { ok: true, figure: { id: updated.id, name: updated.name, profilePath: null, personId: null, isGroup: updated.isGroup } };
}

// Bare figures only -- an actor-linked figure is auto-managed
// (resolveFigureForPerson upserts it whenever that actor is linked again),
// so deleting one wouldn't stick and isn't a normal admin action anyway.
// LineageRelation rows pointing at this figure cascade-delete with it (see
// the onDelete: Cascade on both sides of that relation in schema.prisma),
// so this is the one place that removes every link the figure was part of
// in a single step -- callers should confirm with the admin before calling
// this, the same way deleting a single link already does.
export async function deleteBareFigure(figureId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const figure = await prisma.lineageFigure.findUnique({ where: { id: figureId }, select: { personId: true } });
  if (!figure) {
    return { ok: false, error: "Figure not found." };
  }
  if (figure.personId) {
    return { ok: false, error: "An actor-linked figure can't be deleted here." };
  }
  await prisma.lineageFigure.delete({ where: { id: figureId } });
  return { ok: true };
}

export interface ActorSearchResult {
  personId: string;
  name: string;
  profilePath: string | null;
}
export interface FigureSearchResult {
  figureId: string;
  name: string;
  isGroup: boolean;
}

// Search results are deliberately two separate lists rather than one
// merged-and-tagged list: actors haven't necessarily been resolved to a
// LineageFigure yet (that only happens once they're actually picked), so an
// "actor" result and a "figure" result carry different id kinds and can't
// share a shape without that ambiguity leaking into every caller.
export async function searchLineageFigures(
  query: string,
): Promise<{ actors: ActorSearchResult[]; figures: FigureSearchResult[] }> {
  const [people, figures] = await Promise.all([
    prisma.person.findMany({
      where: { name: { contains: query, mode: "insensitive" } },
      select: { id: true, name: true, profilePath: true },
      orderBy: { name: "asc" },
      take: 8,
    }),
    prisma.lineageFigure.findMany({
      where: { personId: null, name: { contains: query, mode: "insensitive" } },
      select: { id: true, name: true, isGroup: true },
      orderBy: { name: "asc" },
      take: 8,
    }),
  ]);
  return {
    actors: people.map((p) => ({ personId: p.id, name: p.name, profilePath: p.profilePath })),
    figures: figures.map((f) => ({ figureId: f.id, name: f.name, isGroup: f.isGroup })),
  };
}

// A bare figure has no photo of its own, but the catalog often already
// knows who's played them on screen -- CastCredit.characterName is exact
// free text from TMDB, so this is a best-effort case-insensitive match, not
// a stored link (more than one actor can plausibly have played the same
// figure across different films, so it couldn't be a single FK anyway).
// Display-only enrichment: never used to resolve identity or write data.
export async function getPortrayals(name: string): Promise<{ person: PersonRef; movieTitle: string }[]> {
  const credits = await prisma.castCredit.findMany({
    where: { characterName: { equals: name, mode: "insensitive" }, movie: { status: "APPROVED" } },
    select: {
      person: { select: { id: true, name: true, profilePath: true } },
      movie: { select: { title: true, releaseDate: true } },
    },
    orderBy: { movie: { releaseDate: "asc" } },
    take: 6,
  });
  const seen = new Set<string>();
  const results: { person: PersonRef; movieTitle: string }[] = [];
  for (const credit of credits) {
    if (seen.has(credit.person.id)) continue;
    seen.add(credit.person.id);
    results.push({ person: credit.person, movieTitle: credit.movie.title });
    if (results.length === 3) break;
  }
  return results;
}

// --- Cycle detection -------------------------------------------------

// Loads the whole edge set once (a few hundred rows at this app's scale --
// cheaper and far simpler than a recursive CTE or round-tripping per BFS
// level) and walks it in memory. A cycle would exist if the proposed sifu
// is already reachable *forward* from the proposed student -- i.e. the
// student already taught (directly or transitively) the figure who'd now
// be their own sifu.
export async function wouldCreateCycle(sifuId: string, studentId: string): Promise<boolean> {
  if (sifuId === studentId) return true;

  const edges = await prisma.lineageRelation.findMany({ select: { sifuId: true, studentId: true } });
  const childrenOf = new Map<string, string[]>();
  for (const edge of edges) {
    const list = childrenOf.get(edge.sifuId);
    if (list) list.push(edge.studentId);
    else childrenOf.set(edge.sifuId, [edge.studentId]);
  }

  const visited = new Set<string>([studentId]);
  const queue = [studentId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const child of childrenOf.get(current) ?? []) {
      if (child === sifuId) return true;
      if (!visited.has(child)) {
        visited.add(child);
        queue.push(child);
      }
    }
  }
  return false;
}

// --- Creating a single link -------------------------------------------

export type CreateLineageRelationResult =
  | { ok: true; relation: { id: string; sifuId: string; studentId: string; isPrimary: boolean; note: string | null } }
  | { ok: false; error: string };

// Takes LineageFigure ids on both sides -- resolving an actor pick or a
// "not an actor" name entry into a figure id happens before this is called
// (resolveFigureForPerson / createOrReuseBareFigure), so this function
// doesn't need to know or care which kind of figure it's linking.
//
// The first sifu recorded for a student becomes primary automatically (it's
// the only one, so there's no ranking decision to make). Any sifu added
// afterward defaults to secondary ("co-sifu") unless makePrimary is passed,
// in which case the previous primary is demoted in the same transaction --
// this is the application-level stand-in for the "at most one primary per
// student" constraint noted in schema.prisma.
export async function createLineageRelation(input: {
  sifuId: string;
  studentId: string;
  note?: string | null;
  makePrimary?: boolean;
}): Promise<CreateLineageRelationResult> {
  const { sifuId, studentId } = input;
  const note = input.note?.trim() || null;

  if (sifuId === studentId) {
    return { ok: false, error: "A figure can't be their own sifu." };
  }
  if (note && note.length > MAX_LINEAGE_NOTE_LENGTH) {
    return { ok: false, error: `Note must be ${MAX_LINEAGE_NOTE_LENGTH} characters or fewer.` };
  }

  const [sifu, student, existing] = await Promise.all([
    prisma.lineageFigure.findUnique({ where: { id: sifuId }, select: { id: true } }),
    prisma.lineageFigure.findUnique({ where: { id: studentId }, select: { id: true } }),
    prisma.lineageRelation.findUnique({ where: { sifuId_studentId: { sifuId, studentId } } }),
  ]);
  if (!sifu || !student) {
    return { ok: false, error: "Both sifu and student must already exist." };
  }
  if (existing) {
    return { ok: false, error: "That link already exists." };
  }
  if (await wouldCreateCycle(sifuId, studentId)) {
    return { ok: false, error: "That link would create a cycle in the lineage." };
  }

  const existingPrimary = await prisma.lineageRelation.findFirst({
    where: { studentId, isPrimary: true },
    select: { id: true },
  });
  const isPrimary = !existingPrimary || input.makePrimary === true;

  const relation = await prisma.$transaction(async (tx) => {
    if (isPrimary && existingPrimary) {
      await tx.lineageRelation.update({ where: { id: existingPrimary.id }, data: { isPrimary: false } });
    }
    return tx.lineageRelation.create({ data: { sifuId, studentId, note, isPrimary } });
  });

  return {
    ok: true,
    relation: { id: relation.id, sifuId, studentId, isPrimary, note },
  };
}

// If the deleted relation was the primary sifu link, the next-oldest
// remaining sifu (if any) is promoted -- a student who still has at least
// one sifu on record should never be left without a primary, since that's
// what positions them in the rendered tree.
export async function deleteLineageRelation(id: string): Promise<{ ok: boolean; error?: string }> {
  const existing = await prisma.lineageRelation.findUnique({ where: { id } });
  if (!existing) {
    return { ok: false, error: "Link not found." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.lineageRelation.delete({ where: { id } });
    if (existing.isPrimary) {
      const nextPrimary = await tx.lineageRelation.findFirst({
        where: { studentId: existing.studentId },
        orderBy: { createdAt: "asc" },
      });
      if (nextPrimary) {
        await tx.lineageRelation.update({ where: { id: nextPrimary.id }, data: { isPrimary: true } });
      }
    }
  });
  return { ok: true };
}

// --- Bulk chain import --------------------------------------------------

export interface ChainPair {
  sifuName: string;
  studentName: string;
}

// "A > B > C" (one chain per line) becomes pairs (A,B) and (B,C). Blank
// lines and single-name lines (nothing to link) are skipped. Duplicate
// pairs across the paste (case-insensitive) are collapsed to their first
// occurrence -- a name appearing in more than one chain is expected (e.g.
// the same sifu heading two separate lines).
export function parseLineageChains(text: string): ChainPair[] {
  const pairs: ChainPair[] = [];
  const seen = new Set<string>();

  for (const rawLine of text.split("\n")) {
    const names = rawLine
      .split(">")
      .map((n) => n.trim())
      .filter((n) => n.length > 0);
    for (let i = 0; i < names.length - 1; i++) {
      const sifuName = names[i];
      const studentName = names[i + 1];
      const key = `${sifuName.toLowerCase()} ${studentName.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      pairs.push({ sifuName, studentName });
    }
  }
  return pairs;
}

// Bulk import stays actor-matching only for now -- most lineage entries
// resolve to someone already in the catalog, and a name bulk-import can't
// match is left as "not found" rather than silently minted into a new bare
// figure (a typo shouldn't quietly become a permanent phantom entry).
// Adding non-actor figures goes through the single-link form or the tree's
// "not an actor?" fallback instead, both of which are an explicit, reviewed
// action rather than a batch of hundreds of guesses.
export type NameMatch =
  | { status: "found"; person: PersonRef }
  | { status: "ambiguous"; candidates: PersonRef[] }
  | { status: "not_found" };

async function matchPersonByName(name: string): Promise<NameMatch> {
  const matches = await prisma.person.findMany({
    where: { name: { equals: name, mode: "insensitive" } },
    select: { id: true, name: true, profilePath: true },
    take: 5,
  });
  if (matches.length === 0) return { status: "not_found" };
  if (matches.length === 1) return { status: "found", person: matches[0] };
  return { status: "ambiguous", candidates: matches };
}

export type BulkPreviewRowStatus = "new" | "exists" | "ambiguous" | "not_found" | "invalid";

export interface BulkPreviewRow {
  sifuName: string;
  studentName: string;
  status: BulkPreviewRowStatus;
  message?: string;
  sifu: NameMatch;
  student: NameMatch;
}

export async function previewBulkImport(text: string): Promise<BulkPreviewRow[]> {
  const pairs = parseLineageChains(text);
  const nameCache = new Map<string, NameMatch>();

  async function resolve(name: string): Promise<NameMatch> {
    const key = name.toLowerCase();
    const cached = nameCache.get(key);
    if (cached) return cached;
    const result = await matchPersonByName(name);
    nameCache.set(key, result);
    return result;
  }

  const rows: BulkPreviewRow[] = [];
  for (const pair of pairs) {
    if (pair.sifuName.toLowerCase() === pair.studentName.toLowerCase()) {
      rows.push({
        ...pair,
        status: "invalid",
        message: "A person can't be their own sifu.",
        sifu: { status: "not_found" },
        student: { status: "not_found" },
      });
      continue;
    }

    const [sifu, student] = await Promise.all([resolve(pair.sifuName), resolve(pair.studentName)]);

    if (sifu.status === "not_found" || student.status === "not_found") {
      const missing = sifu.status === "not_found" ? pair.sifuName : pair.studentName;
      rows.push({ ...pair, status: "not_found", message: `No actor named "${missing}"`, sifu, student });
      continue;
    }
    if (sifu.status === "ambiguous" || student.status === "ambiguous") {
      rows.push({ ...pair, status: "ambiguous", sifu, student });
      continue;
    }

    // Neither side is necessarily a LineageFigure yet -- an actor who's
    // never been linked before has none, so there's trivially no existing
    // relation to find. Only look it up (read-only) when both already do.
    const [sifuFigureId, studentFigureId] = await Promise.all([
      getFigureIdForPerson(sifu.person.id),
      getFigureIdForPerson(student.person.id),
    ]);
    const existing =
      sifuFigureId && studentFigureId
        ? await prisma.lineageRelation.findUnique({
            where: { sifuId_studentId: { sifuId: sifuFigureId, studentId: studentFigureId } },
          })
        : null;
    rows.push({ ...pair, status: existing ? "exists" : "new", sifu, student });
  }
  return rows;
}

// --- Reading the tree ---------------------------------------------------

export interface DescendantGroup {
  parent: LineageFigureRef;
  children: LineageFigureRef[];
  overflowCount: number;
}

export interface LineageTree {
  center: LineageFigureRef;
  ancestors: LineageFigureRef[];
  ancestorsTruncated: boolean;
  secondarySifus: LineageFigureRef[];
  descendantLevels: DescendantGroup[][];
  descendantsTruncated: boolean;
}

export async function getLineageTree(
  figureId: string,
  options?: { up?: number; down?: number; siblingLimit?: number; groupSiblingLimit?: number },
): Promise<LineageTree | null> {
  const up = options?.up ?? DEFAULT_UP_GENERATIONS;
  const down = options?.down ?? DEFAULT_DOWN_GENERATIONS;
  const siblingLimit = options?.siblingLimit ?? DEFAULT_SIBLING_LIMIT;
  const groupSiblingLimit = options?.groupSiblingLimit ?? DEFAULT_GROUP_SIBLING_LIMIT;

  const centerRow = await prisma.lineageFigure.findUnique({ where: { id: figureId }, select: figureSelect });
  if (!centerRow) return null;
  const center = toFigureRef(centerRow);

  const ancestors: LineageFigureRef[] = [];
  let ancestorsTruncated = false;
  let cursorId = figureId;
  for (let i = 0; i < up; i++) {
    const primaryLink = await prisma.lineageRelation.findFirst({
      where: { studentId: cursorId, isPrimary: true },
      select: { sifu: { select: figureSelect } },
    });
    if (!primaryLink) break;
    const sifuRef = toFigureRef(primaryLink.sifu);
    ancestors.push(sifuRef);
    cursorId = sifuRef.id;
    if (i === up - 1) {
      const hasMore = await prisma.lineageRelation.findFirst({
        where: { studentId: cursorId, isPrimary: true },
        select: { id: true },
      });
      ancestorsTruncated = !!hasMore;
    }
  }

  const secondaryLinks = await prisma.lineageRelation.findMany({
    where: { studentId: figureId, isPrimary: false },
    select: { sifu: { select: figureSelect } },
  });

  const descendantLevels: DescendantGroup[][] = [];
  let parents = [center];
  let descendantsTruncated = false;
  for (let level = 0; level < down && parents.length > 0; level++) {
    const groups: DescendantGroup[] = [];
    for (const parent of parents) {
      const links = await prisma.lineageRelation.findMany({
        where: { sifuId: parent.id, isPrimary: true },
        orderBy: { createdAt: "asc" },
        select: { student: { select: figureSelect } },
      });
      if (links.length === 0) continue;
      const children = links.map((l) => toFigureRef(l.student));
      // A group's own roster is capped more generously than an
      // individual's -- a stunt team can run far larger than any one
      // person's students, so the default limit would undersell the page.
      const limit = parent.isGroup ? groupSiblingLimit : siblingLimit;
      groups.push({
        parent,
        children: children.slice(0, limit),
        overflowCount: Math.max(0, children.length - limit),
      });
    }
    if (groups.length === 0) break;
    descendantLevels.push(groups);
    parents = groups.flatMap((g) => g.children);
    // Reached the bottom of the requested window -- check whether any of
    // the last level's figures have primary students of their own (as
    // opposed to `groups.length === 0` above, which means there's
    // genuinely nothing further); the caller can ask again with a larger
    // `down` to see them.
    if (level === down - 1) {
      const more = await prisma.lineageRelation.findFirst({
        where: { sifuId: { in: parents.map((p) => p.id) }, isPrimary: true },
        select: { id: true },
      });
      descendantsTruncated = !!more;
    }
  }

  return {
    center,
    ancestors,
    ancestorsTruncated,
    secondarySifus: secondaryLinks.map((l) => toFigureRef(l.sifu)),
    descendantLevels,
    descendantsTruncated,
  };
}
