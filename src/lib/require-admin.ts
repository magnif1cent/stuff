import { auth } from "@/lib/auth";

export async function requireAdminSession() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return null;
  }
  return session;
}

// REVIEWER is a narrower role than ADMIN: movie-submission approval/rejection,
// fight-scene-tag management, and fight-scene verification only — everything
// else admin-gated (TMDB import, News & Updates, catalog deletion, Editorial
// Reviews, discussion moderation, etc.) stays ADMIN-only via
// requireAdminSession above. Account self-service (own email/password) is
// also open to REVIEWER, same rationale as why it exists for ADMIN at all:
// self-managing your own credentials beats needing someone to run raw SQL.
export async function requireReviewerSession() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "REVIEWER")) {
    return null;
  }
  return session;
}
