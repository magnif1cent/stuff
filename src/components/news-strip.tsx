import type { NewsPostItem } from "@/components/news-list";

// Fixed excerpt length for every post on the homepage strip, regardless of
// content length — unlike the archive page's threshold-based clamp, this
// keeps every entry visually uniform. No expand toggle here on purpose:
// the section already has a "View all" link to the full archive, so a
// second per-post click-to-expand affordance would be redundant.
const EXCERPT_LENGTH = 300;

function excerpt(content: string) {
  if (content.length <= EXCERPT_LENGTH) return content;
  const truncated = content.slice(0, EXCERPT_LENGTH);
  const lastSpace = truncated.lastIndexOf(" ");
  return `${truncated.slice(0, lastSpace > 0 ? lastSpace : EXCERPT_LENGTH)}…`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

export function NewsStrip({ posts }: { posts: NewsPostItem[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {posts.map((post) => (
        <article key={post.id} className="rounded-md border border-neutral-800 bg-neutral-900 p-4">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-red-500">Site Update</p>
          <h3 className="font-serif text-lg font-bold text-white">{post.title}</h3>
          <p className="mb-2 text-xs text-neutral-500">
            {post.author.username} · {formatDate(post.createdAt)}
          </p>
          <p className="whitespace-pre-wrap text-sm text-neutral-300">{excerpt(post.content)}</p>
        </article>
      ))}
    </div>
  );
}
