import { prisma } from "@/lib/prisma";

// Most-recently-written-or-edited reviews, not "most recently created" —
// an admin revising an older review is exactly the kind of freshness a
// "recently reviewed" feed should surface, not just brand-new reviews.
export async function getRecentEditorialReviews(limit = 5) {
  return prisma.editorialReview.findMany({
    where: { movie: { status: "APPROVED" } },
    orderBy: { updatedAt: "desc" },
    take: limit,
    include: {
      movie: {
        select: { id: true, title: true, releaseDate: true, posterPath: true, posterOverrideUrl: true },
      },
      author: { select: { username: true } },
    },
  });
}
