import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isEmailVerified } from "@/lib/verification";
import { FORUM_THREAD_PAGE_SIZE, getForumThreadPage } from "@/lib/forum";
import { NewForumThreadForm } from "@/components/new-forum-thread-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category: slug } = await params;
  const category = await prisma.forumCategory.findUnique({ where: { slug } });
  if (!category) return {};
  return { title: category.name, description: category.description ?? undefined };
}

function pageHref(slug: string, page: number) {
  return page > 1 ? `/forum/${slug}?page=${page}` : `/forum/${slug}`;
}

function timeAgo(iso: Date) {
  const seconds = Math.floor((Date.now() - iso.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default async function ForumCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { category: slug } = await params;
  const category = await prisma.forumCategory.findUnique({ where: { slug } });
  if (!category) notFound();

  const { page: pageParam } = await searchParams;
  const totalCount = await prisma.forumThread.count({ where: { categoryId: category.id, isDeleted: false } });
  const totalPages = Math.max(1, Math.ceil(totalCount / FORUM_THREAD_PAGE_SIZE));
  const page = Math.min(Math.max(1, Number(pageParam) || 1), totalPages);

  const [{ threads }, session] = await Promise.all([getForumThreadPage(category.id, page), auth()]);
  const verified = session?.user ? await isEmailVerified(session.user.id) : false;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <Link href="/forum" className="mb-4 inline-block text-sm text-neutral-400 hover:text-white">
        ← Forum
      </Link>
      <h1 className="mb-1 font-serif text-2xl font-bold text-white">{category.name}</h1>
      {category.description && <p className="mb-6 text-sm text-neutral-400">{category.description}</p>}

      <div className="mb-6">
        {!session?.user ? (
          <p className="text-sm text-neutral-400">
            <a href={`/login?callbackUrl=/forum/${category.slug}`} className="text-red-500 hover:underline">
              Sign in
            </a>{" "}
            to start a thread.
          </p>
        ) : verified ? (
          <NewForumThreadForm categoryId={category.id} categorySlug={category.slug} />
        ) : (
          <p className="text-sm text-amber-400">Verify your email before starting a thread.</p>
        )}
      </div>

      <ul className="flex flex-col gap-2">
        {threads.map((thread) => (
          <li key={thread.id}>
            <Link
              href={`/forum/${category.slug}/${thread.id}`}
              className="block rounded-md border border-neutral-800 bg-neutral-900 p-3 hover:border-neutral-700"
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-medium text-white">
                  {thread.isPinned && <span className="mr-1 text-amber-400">📌</span>}
                  {thread.isLocked && <span className="mr-1 text-neutral-500">🔒</span>}
                  {thread.title}
                </h2>
                <span className="shrink-0 text-xs text-neutral-500">
                  {thread._count.posts} post{thread._count.posts === 1 ? "" : "s"}
                </span>
              </div>
              <p className="mt-1 text-xs text-neutral-500">
                {thread.author.username} · {timeAgo(thread.updatedAt)}
              </p>
            </Link>
          </li>
        ))}
        {threads.length === 0 && (
          <p className="text-sm text-neutral-500">No threads yet. Be the first to start one.</p>
        )}
      </ul>

      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-4 text-sm">
          {page > 1 ? (
            <Link href={pageHref(category.slug, page - 1)} className="text-red-500 hover:underline">
              ← Previous
            </Link>
          ) : (
            <span className="text-neutral-600">← Previous</span>
          )}
          <span className="text-neutral-400">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link href={pageHref(category.slug, page + 1)} className="text-red-500 hover:underline">
              Next →
            </Link>
          ) : (
            <span className="text-neutral-600">Next →</span>
          )}
        </div>
      )}
    </div>
  );
}
