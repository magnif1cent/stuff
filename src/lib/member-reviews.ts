import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export const MAX_MEMBER_REVIEW_LENGTH = 5000;

// How many member reviews show inline on the movie page itself before
// linking out to the full paginated list, given unbounded future volume.
export const MEMBER_REVIEWS_PREVIEW_COUNT = 2;

export const MEMBER_REVIEWS_PAGE_SIZE = 10;

const memberReviewOrderBy: Prisma.MemberReviewOrderByWithRelationInput[] = [
  { voteScore: "desc" },
  { createdAt: "desc" },
];

export function getTopMemberReviews(movieId: string, limit: number = MEMBER_REVIEWS_PREVIEW_COUNT) {
  return prisma.memberReview.findMany({
    where: { movieId },
    orderBy: memberReviewOrderBy,
    take: limit,
    include: { author: { select: { username: true } } },
  });
}

export function getMemberReviewsCount(movieId: string) {
  return prisma.memberReview.count({ where: { movieId } });
}

export async function getMemberReviewsPage(movieId: string, page: number) {
  const [reviews, totalCount] = await Promise.all([
    prisma.memberReview.findMany({
      where: { movieId },
      orderBy: memberReviewOrderBy,
      skip: (page - 1) * MEMBER_REVIEWS_PAGE_SIZE,
      take: MEMBER_REVIEWS_PAGE_SIZE,
      include: { author: { select: { username: true } } },
    }),
    getMemberReviewsCount(movieId),
  ]);
  return { reviews, totalCount };
}

export interface MemberReviewVoteSummary {
  up: number;
  down: number;
}

export async function getMemberReviewVoteSummaries(
  reviewIds: string[],
): Promise<Map<string, MemberReviewVoteSummary>> {
  if (reviewIds.length === 0) return new Map();

  const rows = await prisma.memberReviewVote.groupBy({
    by: ["reviewId", "value"],
    where: { reviewId: { in: reviewIds } },
    _count: { _all: true },
  });

  const map = new Map<string, MemberReviewVoteSummary>();
  for (const row of rows) {
    const summary = map.get(row.reviewId) ?? { up: 0, down: 0 };
    if (row.value === 1) summary.up = row._count._all;
    else if (row.value === -1) summary.down = row._count._all;
    map.set(row.reviewId, summary);
  }
  return map;
}
