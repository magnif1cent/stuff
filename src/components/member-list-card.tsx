import Link from "next/link";
import { ListCoverCollage } from "@/components/list-cover-collage";
import type { MemberListCardData } from "@/lib/lists";

export type MemberListCardProps = Omit<MemberListCardData, "updatedAt"> & {
  // Pre-formatted on the server ("3d ago"), so a client-rendered card can't
  // hydrate with a different relative time than the server produced.
  updatedLabel: string;
};

// One list on a member's profile Lists tab: a small cover, the name as the
// link into the list, badges, a two-line description and counts. Replaces
// rendering each list's items inline (see "Profile Lists tab shows one card
// per list" in DECISIONS.md). `actions` is the owner's Rename/Delete row,
// and `title` lets the owner's manager swap the name for a rename input.
export function MemberListCard({
  list,
  title,
  actions,
}: {
  list: MemberListCardProps;
  title?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const itemCount = list.movieCount + list.fightSceneCount;
  const parts = [
    `${itemCount} ${itemCount === 1 ? "item" : "items"}`,
    list.movieCount > 0 && `${list.movieCount} ${list.movieCount === 1 ? "movie" : "movies"}`,
    list.fightSceneCount > 0 && `${list.fightSceneCount} ${list.fightSceneCount === 1 ? "fight" : "fights"}`,
    list.likeCount > 0 && `♥ ${list.likeCount}`,
    `updated ${list.updatedLabel}`,
  ].filter(Boolean);

  return (
    <article className="flex min-w-0 gap-3.5 rounded-lg border border-neutral-800 bg-neutral-900 p-3">
      <Link
        href={`/lists/${list.id}`}
        aria-hidden="true"
        tabIndex={-1}
        className="w-24 shrink-0 self-start overflow-hidden rounded sm:w-28"
      >
        <ListCoverCollage tiles={list.coverTiles} listName={list.name} />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          {title ?? (
            <Link href={`/lists/${list.id}`} className="text-base font-bold text-white hover:text-red-400 sm:text-[17px]">
              {list.name}
            </Link>
          )}
          {list.isPrivate && (
            <span className="inline-flex items-center gap-1 rounded-full border border-neutral-700 px-2 py-0.5 font-mono text-[9px] tracking-wide text-neutral-300 uppercase">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-2.5 w-2.5">
                <rect x="4" y="11" width="16" height="10" rx="2" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
              </svg>
              Private
            </span>
          )}
          {list.isRanked && (
            <span className="rounded-full border border-red-900 bg-red-950/60 px-2 py-0.5 font-mono text-[9px] tracking-wide text-red-300 uppercase">
              Ranked
            </span>
          )}
        </div>
        {list.description ? (
          <p className="line-clamp-2 text-[13px] leading-snug text-neutral-400">{list.description}</p>
        ) : (
          <p className="text-[13px] text-neutral-600 italic">No description</p>
        )}
        <p className="text-xs text-neutral-500">{parts.join(" · ")}</p>
        {actions && <div className="mt-auto flex gap-1 pt-1">{actions}</div>}
      </div>
    </article>
  );
}
