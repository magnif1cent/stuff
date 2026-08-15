// Real per-admin badge icons, keyed by the admin's (immutable) user id, not
// their username — a username is a mutable, member-changeable field (see
// DECISIONS.md), so keying this table by it silently orphaned an admin's
// badge the moment they renamed. Takes precedence over the generic
// colored-circle placeholder in RecommendedBadges. Add an entry here once an
// admin has a real icon image (under public/badges/); admins without one
// still fall back to the placeholder automatically.
export const ADMIN_BADGE_ICONS: Record<string, string> = {
  cms87tzb7000fqstccf83d453: "/badges/wang-seal.png",
};
