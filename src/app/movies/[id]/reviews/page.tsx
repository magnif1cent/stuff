import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getMemberReviewsPage,
  getMemberReviewsCount,
  getMemberReviewVoteSummaries,
  MEMBER_REVIEWS_PAGE_SIZE,
} from "@/lib/member-reviews";
import { MemberReviewsList } from "@/components/member-reviews-list";

// Pending movies are only visible to their submitter and admins/reviewers,
// same rule as the movie detail page itself (isMovieVisible there) --
// duplicated here rather than shared since it's a two-line check against a
// differently-shaped select.
function isMovieVisible(
  movie: { status: string; submittedById: string | null },
  session: Session | null,
) {
  return (
    movie.status === "APPROVED" ||
    session?.user?.role === "ADMIN" ||
    session?.user?.role === "REVIEWER" ||
    session?.user?.id === movie.submittedById
  );
}

function pageHref(movieId: string, page: number) {
  return page > 1 ? `/movies/${movieId}/reviews?page=${page}` : `/movies/${movieId}/reviews`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const movie = await prisma.movie.findUnique({ where: { id }, select: { title: true } });
  return movie ? { title: `Reviews — ${movie.title}` } : {};
}

export default async function MemberReviewsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id: movieId } = await params;
  const { page: pageParam } = await searchParams;
  const session = await auth();

  const movie = await prisma.movie.findUnique({
    where: { id: movieId },
    select: { id: true, title: true, status: true, submittedById: true },
  });
  if (!movie || !isMovieVisible(movie, session)) {
    notFound();
  }

  const totalCount = await getMemberReviewsCount(movieId);
  const totalPages = Math.max(1, Math.ceil(totalCount / MEMBER_REVIEWS_PAGE_SIZE));
  const page = Math.min(Math.max(1, Number(pageParam) || 1), totalPages);

  const { reviews } = await getMemberReviewsPage(movieId, page);
  const reviewIds = reviews.map((r) => r.id);

  const [voteSummaries, myVotes] = await Promise.all([
    getMemberReviewVoteSummaries(reviewIds),
    session?.user
      ? prisma.memberReviewVote.findMany({
          where: { userId: session.user.id, reviewId: { in: reviewIds } },
        })
      : [],
  ]);
  const myVoteMap = new Map(myVotes.map((v) => [v.reviewId, v.value as 1 | -1]));

  const serializedReviews = reviews.map((review) => {
    const summary = voteSummaries.get(review.id);
    return {
      id: review.id,
      content: review.content,
      authorId: review.authorId,
      createdAt: review.createdAt.toISOString(),
      updatedAt: review.updatedAt.toISOString(),
      author: review.author,
      up: summary?.up ?? 0,
      down: summary?.down ?? 0,
      myVote: myVoteMap.get(review.id) ?? null,
    };
  });

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <Link href={`/movies/${movieId}`} className="text-sm text-red-500 hover:underline">
        ← Back to {movie.title}
      </Link>
      <h1 className="mb-6 mt-2 font-serif text-2xl font-bold text-white">
        Reviews for {movie.title}
      </h1>

      {serializedReviews.length === 0 ? (
        <p className="text-neutral-400">No reviews yet.</p>
      ) : (
        <>
          <MemberReviewsList
            movieId={movieId}
            initialReviews={serializedReviews}
            signedIn={!!session?.user}
            currentUserId={session?.user?.id ?? null}
            isAdmin={session?.user?.role === "ADMIN"}
          />

          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-4 text-sm">
              {page > 1 ? (
                <Link href={pageHref(movieId, page - 1)} className="text-red-500 hover:underline">
                  ← Previous
                </Link>
              ) : (
                <span className="text-neutral-600">← Previous</span>
              )}
              <span className="text-neutral-400">
                Page {page} of {totalPages} ({totalCount} reviews)
              </span>
              {page < totalPages ? (
                <Link href={pageHref(movieId, page + 1)} className="text-red-500 hover:underline">
                  Next →
                </Link>
              ) : (
                <span className="text-neutral-600">Next →</span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
