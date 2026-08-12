import { prisma } from "@/lib/prisma";
import { AdminNews } from "@/components/admin-news";

export default async function AdminNewsPage() {
  const posts = await prisma.newsPost.findMany({
    orderBy: { createdAt: "desc" },
    include: { author: { select: { username: true } } },
  });

  return (
    <div className="max-w-2xl">
      <h1 className="mb-2 text-2xl font-bold text-white">News &amp; Updates</h1>
      <p className="mb-6 text-sm text-neutral-400">
        Posts shown on the public <code>/news</code> page and as a homepage teaser for the latest one. Any admin
        can create, edit, or delete any post.
      </p>
      <AdminNews initialPosts={posts} />
    </div>
  );
}
