import Image from "next/image";
import Link from "next/link";
import { tmdbImageUrl } from "@/lib/tmdb";
import { getPortrayals, type LineageTree, type LineageFigureRef } from "@/lib/lineage";
import { LineagePersonChip } from "@/components/lineage-person-chip";

// A bare figure's own page (or CastCredit lookup for "portrayed by") is
// keyed by figureId; an actor-linked figure's is keyed by their personId --
// the public tree always re-centers through whichever is the figure's
// canonical URL, so admin edits and public browsing land on the same page.
function figureHref(figure: LineageFigureRef): string {
  return figure.personId ? `/actors/${figure.personId}/lineage` : `/lineage/${figure.id}`;
}

// Best-effort "played by" caption for bare figures (Ip Man, say) -- derived
// live from CastCredit.characterName, not stored anywhere (see
// getPortrayals in lib/lineage.ts for why: more than one actor can
// plausibly have played the same figure). Skipped for actor-linked figures,
// which already show their own real photo.
async function Portrayal({ figure }: { figure: LineageFigureRef }) {
  if (figure.personId) return null;
  const portrayals = await getPortrayals(figure.name);
  if (portrayals.length === 0) return null;
  return (
    <p className="mt-1 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 text-[10px] text-neutral-600">
      Played by
      {portrayals.map(({ person, movieTitle }, i) => (
        <span key={person.id}>
          <Link href={`/actors/${person.id}`} className="text-neutral-500 hover:text-red-500">
            {person.name}
          </Link>
          <span className="text-neutral-700"> ({movieTitle})</span>
          {i < portrayals.length - 1 && ","}
        </span>
      ))}
    </p>
  );
}

export async function LineageTreeBody({ tree, up, down }: { tree: LineageTree; up: number; down: number }) {
  const isEmpty = tree.ancestors.length === 0 && tree.secondarySifus.length === 0 && tree.descendantLevels.length === 0;

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

      {[...tree.ancestors].reverse().map((ancestor) => (
        <div key={ancestor.id} className="flex flex-col items-center gap-2">
          <div className="flex flex-col items-center">
            <LineagePersonChip figure={ancestor} size={44} href={figureHref(ancestor)} />
            <Portrayal figure={ancestor} />
          </div>
          <span className="text-neutral-700">&darr;</span>
        </div>
      ))}

      {tree.secondarySifus.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-neutral-500">
          Co-sifu:
          {tree.secondarySifus.map((s) => (
            <span key={s.id} className="rounded-full border border-dashed border-neutral-700 px-2.5 py-1">
              <LineagePersonChip figure={s} size={20} href={figureHref(s)} />
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-col items-center gap-1 rounded-md border-2 border-red-600 bg-red-950/60 px-5 py-3 text-center">
        <span className="relative mb-1 flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-neutral-800 text-sm font-semibold text-neutral-400">
          {tree.center.profilePath ? (
            <Image
              src={tmdbImageUrl(tree.center.profilePath, "w200") ?? ""}
              alt=""
              fill
              unoptimized
              sizes="48px"
              className="object-cover"
            />
          ) : (
            tree.center.name
              .split(/\s+/)
              .map((w) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()
          )}
        </span>
        <span className="text-base font-semibold text-white">{tree.center.name}</span>
        <Portrayal figure={tree.center} />
      </div>

      {tree.descendantLevels.map((groups, levelIndex) => (
        <div key={levelIndex} className="flex flex-col items-center gap-2">
          <span className="text-neutral-700">&darr;</span>
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-4">
            {groups.map((group) => {
              const siblingCount = group.children.length + (group.overflowCount > 0 ? 1 : 0);
              return (
                <div key={group.parent.id} className="flex flex-col items-center gap-1.5">
                  {/* A border alone is easy to miss, especially once a row
                      wraps into a stack on a narrow screen and could pass
                      for a continuing chain -- name the relationship
                      outright instead of relying on the box being noticed.
                      Skipped only for a single child under a single parent,
                      where "taught by" is already the only reading. */}
                  {siblingCount > 1 && (
                    <p className="text-[11px] font-medium text-neutral-500">
                      {group.parent.name}&rsquo;s students ({siblingCount})
                    </p>
                  )}
                  <div
                    className={
                      siblingCount > 1
                        ? "flex flex-wrap justify-center gap-4 rounded-lg border border-neutral-700 bg-neutral-900/60 p-3"
                        : "flex flex-wrap justify-center gap-4"
                    }
                  >
                    {group.children.map((child) => (
                      <div key={child.id} className="flex flex-col items-center">
                        <LineagePersonChip figure={child} size={40} href={figureHref(child)} />
                        <Portrayal figure={child} />
                      </div>
                    ))}
                    {group.overflowCount > 0 && (
                      <span className="flex h-10 items-center rounded-full border-2 border-dashed border-neutral-700 px-3 text-xs text-neutral-500">
                        +{group.overflowCount} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

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
