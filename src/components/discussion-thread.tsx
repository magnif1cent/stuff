"use client";

import { useState } from "react";

interface PostUser {
  name: string | null;
  image: string | null;
}

interface Reply {
  id: string;
  content: string;
  createdAt: string;
  user: PostUser;
}

interface Post extends Reply {
  replies: Reply[];
}

function timeAgo(iso: string) {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function DiscussionThread({
  movieId,
  initialPosts,
  signedIn,
}: {
  movieId: string;
  initialPosts: Post[];
  signedIn: boolean;
}) {
  const [posts, setPosts] = useState(initialPosts);
  const [newContent, setNewContent] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function refresh() {
    const res = await fetch(`/api/movies/${movieId}/discussion`);
    if (res.ok) {
      const body = await res.json();
      setPosts(body.posts);
    }
  }

  async function submit(content: string, parentId: string | null) {
    if (!content.trim()) return;
    setSubmitting(true);
    const res = await fetch(`/api/movies/${movieId}/discussion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, parentId }),
    });
    setSubmitting(false);
    if (res.ok) {
      if (parentId) {
        setReplyContent("");
        setReplyingTo(null);
      } else {
        setNewContent("");
      }
      await refresh();
    }
  }

  return (
    <section className="mt-10">
      <h2 className="mb-4 text-xl font-bold text-white">Discussion</h2>

      {signedIn ? (
        <div className="mb-6 flex flex-col gap-2">
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Share your thoughts on this movie…"
            rows={3}
            className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
          />
          <button
            onClick={() => submit(newContent, null)}
            disabled={submitting || !newContent.trim()}
            className="w-fit rounded-md bg-red-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
          >
            Post
          </button>
        </div>
      ) : (
        <p className="mb-6 text-sm text-neutral-400">
          <a href="/login" className="text-red-500 hover:underline">
            Sign in
          </a>{" "}
          to join the discussion.
        </p>
      )}

      <ul className="flex flex-col gap-4">
        {posts.map((post) => (
          <li key={post.id} className="rounded-md border border-neutral-800 bg-neutral-900 p-3">
            <div className="mb-1 flex items-center gap-2 text-sm">
              <span className="font-medium text-neutral-100">{post.user.name ?? "Anonymous"}</span>
              <span className="text-neutral-500">{timeAgo(post.createdAt)}</span>
            </div>
            <p className="whitespace-pre-wrap text-sm text-neutral-200">{post.content}</p>

            {signedIn && (
              <button
                onClick={() => setReplyingTo(replyingTo === post.id ? null : post.id)}
                className="mt-2 text-xs text-neutral-400 hover:text-white"
              >
                Reply
              </button>
            )}

            {replyingTo === post.id && (
              <div className="mt-2 flex flex-col gap-2 border-l-2 border-neutral-700 pl-3">
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  rows={2}
                  placeholder="Write a reply…"
                  className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
                />
                <button
                  onClick={() => submit(replyContent, post.id)}
                  disabled={submitting || !replyContent.trim()}
                  className="w-fit rounded-md bg-neutral-700 px-3 py-1 text-xs font-medium text-white hover:bg-neutral-600 disabled:opacity-50"
                >
                  Reply
                </button>
              </div>
            )}

            {post.replies.length > 0 && (
              <ul className="mt-3 flex flex-col gap-3 border-l-2 border-neutral-800 pl-3">
                {post.replies.map((reply) => (
                  <li key={reply.id}>
                    <div className="mb-1 flex items-center gap-2 text-sm">
                      <span className="font-medium text-neutral-100">
                        {reply.user.name ?? "Anonymous"}
                      </span>
                      <span className="text-neutral-500">{timeAgo(reply.createdAt)}</span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-neutral-200">{reply.content}</p>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
        {posts.length === 0 && (
          <p className="text-sm text-neutral-500">No posts yet. Be the first to start the discussion.</p>
        )}
      </ul>
    </section>
  );
}
