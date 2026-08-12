import { adminBadgeColor, adminInitial } from "@/lib/admin-badge";
import type { MovieRecommender } from "@/lib/movie-recommendations";

export function RecommendedBadges({
  recommenders,
  size = "sm",
}: {
  recommenders: MovieRecommender[];
  size?: "sm" | "md";
}) {
  if (recommenders.length === 0) return null;

  const dimensionClass = size === "sm" ? "h-5 w-5 text-[10px]" : "h-7 w-7 text-xs";

  return (
    <div className="flex items-center -space-x-1.5">
      {recommenders.map((recommender) => (
        <span
          key={recommender.id}
          title={`Recommended by ${recommender.username}`}
          className={`flex ${dimensionClass} shrink-0 items-center justify-center rounded-full border-2 border-neutral-950 font-bold text-white`}
          style={{ backgroundColor: adminBadgeColor(recommender.id) }}
        >
          {adminInitial(recommender.username)}
        </span>
      ))}
    </div>
  );
}
