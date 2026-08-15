import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getForumPostPage } from "@/lib/forum";
import { ForumThreadView } from "@/components/forum-thread-view";

async function loadThread(categorySlug: string, threadId: string) {
  const category = await prisma.forumCategory.findUnique({ where: { slug: categorySlug } });
  if (!category) return null;

  const thread = await prisma.forumThread.findUnique({
    where: { id: threadId },
    include: { author: { select: { username: true } } },
  });
  if (!thread || thread.categoryId !== category.id) return null;

  return { category, thread };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; threadId: string }>;
}): Promise<Metadata> {
  const { category: categorySlug, threadId } = await params;
  const result = await loadThread(categorySlug, threadId);
  if (!result) return {};
  return { title: result.thread.isDeleted ? "Deleted thread" : result.thread.title };
}

export default async function ForumThreadPage({
  params,
}: {
  params: Promise<{ category: string; threadId: string }>;
}) {
  const { category: categorySlug, threadId } = await params;
  const result = await loadThread(categorySlug, threadId);
  if (!result) notFound();
  const { category, thread } = result;

  const [{ posts, nextCursor }, session] = await Promise.all([getForumPostPage(thread.id), auth()]);

  const serializedPosts = posts.map((post) => ({
    ...post,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    replies: post.replies.map((reply) => ({
      ...reply,
      createdAt: reply.createdAt.toISOString(),
      updatedAt: reply.updatedAt.toISOString(),
    })),
  }));

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <Link href={`/forum/${category.slug}`} className="mb-4 inline-block text-sm text-neutral-400 hover:text-white">
        ← {category.name}
      </Link>

      <ForumThreadView
        thread={thread}
        categorySlug={category.slug}
        initialPosts={serializedPosts}
        initialNextCursor={nextCursor}
        signedIn={!!session?.user}
        currentUserId={session?.user?.id ?? null}
        isModerator={session?.user?.role === "ADMIN" || session?.user?.role === "REVIEWER"}
      />
    </div>
  );
}
