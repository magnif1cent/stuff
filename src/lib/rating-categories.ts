// Split out from src/lib/ratings.ts so client components (RatingCard) can
// import the category list without pulling in ratings.ts's `@/lib/prisma`
// import — that drags the Node-only `pg` driver into the client bundle,
// which Next.js can't build for the browser.

// Fixed, hardcoded vocabulary (not an admin-configurable taxonomy table like
// Genre/FightSceneTag) — same convention as User.role: a small closed set
// with app-level validation, not something meant to grow member-by-member.
// `category` columns on SubcategoryRating/SubcategoryAdminRating store the
// `key` values below.
export const RATING_CATEGORIES = [
  { key: "FIGHT_CHOREOGRAPHY", label: "Fight Choreography" },
  { key: "STORY", label: "Story" },
  { key: "ACTING", label: "Acting" },
] as const;

export type RatingCategoryKey = (typeof RATING_CATEGORIES)[number]["key"];

export function isRatingCategoryKey(value: unknown): value is RatingCategoryKey {
  return typeof value === "string" && RATING_CATEGORIES.some((c) => c.key === value);
}
