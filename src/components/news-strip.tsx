import type { NewsPostItem } from "@/components/news-list";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

export function NewsStrip({ posts }: { posts: NewsPostItem[] }) {
  return (
    <div className="divide-y divide-neutral-800 border-y border-neutral-800">
      {posts.map((post) => (
        <article key={post.id} className="py-3">
          <h3 className="font-serif text-base font-bold text-white">{post.title}</h3>
          <p className="text-xs text-neutral-500">
            {post.author.username} · {formatDate(post.createdAt)}
          </p>
        </article>
      ))}
    </div>
  );
}
