// Placeholder look for a recommending admin's badge until real per-admin icon
// images are provided — a colored circle with their initial. Swapping in a
// real icon later just means rendering an <img> keyed by admin id/username
// instead of this circle, in RecommendedBadges below.
const BADGE_COLORS = ["#dc2626", "#2563eb", "#16a34a", "#9333ea", "#d97706", "#0891b2"];

export function adminBadgeColor(adminId: string): string {
  let hash = 0;
  for (let i = 0; i < adminId.length; i++) {
    hash = (hash * 31 + adminId.charCodeAt(i)) >>> 0;
  }
  return BADGE_COLORS[hash % BADGE_COLORS.length];
}

export function adminInitial(username: string): string {
  return username.charAt(0).toUpperCase();
}
