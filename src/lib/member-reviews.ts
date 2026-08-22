import { prisma } from "@/lib/prisma";

export const MAX_MEMBER_REVIEW_LENGTH = 5000;

export function getMemberReviewsForMovie(movieId: string) {
  return prisma.memberReview.findMany({
    where: { movieId },
    orderBy: { createdAt: "desc" },
    include: { author: { select: { username: true } } },
  });
}
