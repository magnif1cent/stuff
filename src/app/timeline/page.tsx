import type { Metadata } from "next";
import { getTimelineOverview } from "@/lib/timeline";
import { TimelineDesktop } from "@/components/timeline-desktop";
import { TimelineMobile } from "@/components/timeline-mobile";

export const metadata: Metadata = {
  title: "Historical Timeline",
  description: "Movies plotted by the era their story is set in.",
};

export default async function TimelinePage() {
  const { eras, otherCount, unsetCount } = await getTimelineOverview();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <p className="mb-1 font-cond text-xs font-semibold tracking-widest text-red-500 uppercase">Browse by Setting</p>
      <h1 className="mb-2 font-serif text-2xl font-bold text-white">Historical Timeline</h1>
      <p className="max-w-2xl text-sm text-neutral-400">
        Movies plotted by the era their story is set in — not release date.
      </p>

      <div className="hidden md:block">
        <TimelineDesktop eras={eras} />
        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-neutral-600">
          <p>⋯ Legendary/Mythological has no fixed start date, so its band isn&apos;t to scale.</p>
          {(otherCount > 0 || unsetCount > 0) && (
            <p>
              {otherCount > 0 && (
                <>
                  &quot;Other / Unspecified&quot; ({otherCount} {otherCount === 1 ? "movie" : "movies"})
                </>
              )}
              {otherCount > 0 && unsetCount > 0 && " and "}
              {unsetCount > 0 && <>{unsetCount} movies with no historical setting recorded</>}
              {" aren't plotted here."}
            </p>
          )}
        </div>
      </div>

      <div className="md:hidden">
        <TimelineMobile eras={eras} />
      </div>
    </div>
  );
}
