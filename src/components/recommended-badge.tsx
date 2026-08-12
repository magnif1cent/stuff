import Image from "next/image";
import { adminBadgeColor, adminInitial } from "@/lib/admin-badge";
import { ADMIN_BADGE_ICONS } from "@/lib/admin-badge-icons";
import type { MovieRecommender } from "@/lib/movie-recommendations";

const SIZES = { sm: 20, md: 28 } as const;

export function RecommendedBadges({
  recommenders,
  size = "sm",
}: {
  recommenders: MovieRecommender[];
  size?: "sm" | "md";
}) {
  if (recommenders.length === 0) return null;

  const dimensionClass = size === "sm" ? "h-5 w-5 text-[10px]" : "h-7 w-7 text-xs";
  const pixels = SIZES[size];

  return (
    <div className="flex items-center -space-x-1.5">
      {recommenders.map((recommender) => {
        const icon = ADMIN_BADGE_ICONS[recommender.username];
        if (icon) {
          return (
            <Image
              key={recommender.id}
              src={icon}
              alt={`Recommended by ${recommender.username}`}
              title={`Recommended by ${recommender.username}`}
              width={pixels}
              height={pixels}
              className={`${dimensionClass} shrink-0 rounded-full border-2 border-neutral-950 object-contain bg-white`}
            />
          );
        }
        return (
          <span
            key={recommender.id}
            title={`Recommended by ${recommender.username}`}
            className={`flex ${dimensionClass} shrink-0 items-center justify-center rounded-full border-2 border-neutral-950 font-bold text-white`}
            style={{ backgroundColor: adminBadgeColor(recommender.id) }}
          >
            {adminInitial(recommender.username)}
          </span>
        );
      })}
    </div>
  );
}
