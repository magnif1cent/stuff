"use client";

import { useState } from "react";

// Below this length a post reads fine in full without needing a toggle —
// same reasoning and threshold as the homepage's Recent Reviews by Editors
// feed, which established this clamp pattern first.
const CLAMP_THRESHOLD = 220;

export interface NewsPostItem {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  author: { username: string };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function PostContent({ content }: { content: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = content.length > CLAMP_THRESHOLD;

  return (
    <div>
      <p className={`whitespace-pre-wrap text-sm text-neutral-300 ${!expanded && isLong ? "line-clamp-4" : ""}`}>
        {content}
      </p>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-1 text-xs font-medium text-red-500 hover:underline"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}

export function NewsList({ posts }: { posts: NewsPostItem[] }) {
  return (
    <div className="flex flex-col gap-4">
      {posts.map((post) => (
        <article key={post.id} className="rounded-md border border-neutral-800 bg-neutral-900 p-4">
          <h2 className="font-serif text-lg font-bold text-white">{post.title}</h2>
          <p className="mb-2 text-xs text-neutral-500">
            {post.author.username} · {formatDate(post.createdAt)}
          </p>
          <PostContent content={post.content} />
        </article>
      ))}
    </div>
  );
}
