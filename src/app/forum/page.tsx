import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Community Forum",
  description: "General discussion, fan theories, and site feedback — separate from movie discussion threads.",
};

export default async function ForumPage() {
  const categories = await prisma.forumCategory.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { threads: { where: { isDeleted: false } } } } },
  });

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="mb-2 font-serif text-2xl font-bold text-white">Community Forum</h1>
      <p className="mb-6 text-sm text-neutral-400">
        General discussion, separate from a movie&rsquo;s own comment thread &mdash; pick a board below.
      </p>

      <ul className="flex flex-col gap-3">
        {categories.map((category) => (
          <li key={category.id}>
            <Link
              href={`/forum/${category.slug}`}
              className="block rounded-md border border-neutral-800 bg-neutral-900 p-4 hover:border-neutral-700"
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-medium text-white">{category.name}</h2>
                <span className="shrink-0 text-xs text-neutral-500">
                  {category._count.threads} thread{category._count.threads === 1 ? "" : "s"}
                </span>
              </div>
              {category.description && <p className="mt-1 text-sm text-neutral-400">{category.description}</p>}
            </Link>
          </li>
        ))}
        {categories.length === 0 && <p className="text-sm text-neutral-500">No boards yet &mdash; check back soon.</p>}
      </ul>
    </div>
  );
}
