import { prisma } from "@/lib/prisma";
import { AdminForumCategories } from "@/components/admin-forum-categories";

export default async function AdminForumCategoriesPage() {
  const categories = await prisma.forumCategory.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { threads: { where: { isDeleted: false } } } } },
  });

  return (
    <div className="max-w-2xl">
      <h1 className="mb-2 text-2xl font-bold text-white">Forum boards</h1>
      <p className="mb-6 text-sm text-neutral-400">
        Manage the community forum&rsquo;s boards (e.g. &ldquo;General Discussion&rdquo;, &ldquo;Fan
        Theories&rdquo;). Members choose from this list when starting a thread &mdash; they can&rsquo;t create
        their own board.
      </p>
      <AdminForumCategories initialCategories={categories} />
    </div>
  );
}
