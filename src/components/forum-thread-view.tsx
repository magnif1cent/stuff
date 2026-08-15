"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SpoilerText } from "@/components/spoiler-text";
import type { ForumPost, ForumThread, User } from "@/generated/prisma/client";

const MAX_CONTENT_LENGTH = 5000;

type PostAuthor = Pick<User, "username" | "image">;

// createdAt/updatedAt are strings here (not the Prisma Date type) because
// posts cross the server-to-client boundary as JSON.
type PostItem = Pick<ForumPost, "id" | "content" | "authorId" | "isDeleted"> & {
  createdAt: string;
  updatedAt: string;
  author: PostAuthor;
};

interface Post extends PostItem {
  replies: PostItem[];
}

type ThreadInfo = Pick<ForumThread, "id" | "title" | "authorId" | "isPinned" | "isLocked" | "isDeleted"> & {
  author: Pick<User, "username">;
};

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

function wasEdited(item: PostItem) {
  return new Date(item.updatedAt).getTime() - new Date(item.createdAt).getTime() > 1000;
}

export function ForumThreadView({
  thread,
  categorySlug,
  initialPosts,
  initialNextCursor,
  signedIn,
  currentUserId,
  isModerator,
}: {
  thread: ThreadInfo;
  categorySlug: string;
  initialPosts: Post[];
  initialNextCursor: string | null;
  signedIn: boolean;
  currentUserId: string | null;
  isModerator: boolean;
}) {
  const router = useRouter();
  const [posts, setPosts] = useState(initialPosts);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyToThreadContent, setReplyToThreadContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [isPinned, setIsPinned] = useState(thread.isPinned);
  const [isLocked, setIsLocked] = useState(thread.isLocked);
  const [threadDeleted, setThreadDeleted] = useState(thread.isDeleted);

  function updateItem(id: string, updater: (item: PostItem) => PostItem) {
    setPosts((prev) =>
      prev.map((post) => {
        if (post.id === id) return { ...updater(post), replies: post.replies };
        return { ...post, replies: post.replies.map((r) => (r.id === id ? updater(r) : r)) };
      }),
    );
  }

  async function loadMore() {
    if (!nextCursor) return;
    setLoadingMore(true);
    const res = await fetch(`/api/forum/threads/${thread.id}/posts?cursor=${encodeURIComponent(nextCursor)}`);
    setLoadingMore(false);
    if (res.ok) {
      const body = await res.json();
      setPosts((prev) => [...prev, ...body.posts]);
      setNextCursor(body.nextCursor);
    }
  }

  async function submit(content: string, parentId: string | null) {
    if (!content.trim()) return;
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/forum/threads/${thread.id}/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, parentId }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong.");
      return;
    }

    const { post } = await res.json();

    if (parentId) {
      setPosts((prev) => prev.map((p) => (p.id === parentId ? { ...p, replies: [...p.replies, post] } : p)));
      setReplyContent("");
      setReplyingTo(null);
    } else {
      setPosts((prev) => [...prev, { ...post, replies: [] }]);
      setReplyToThreadContent("");
    }
  }

  function startEdit(item: PostItem) {
    setEditingId(item.id);
    setEditContent(item.content);
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditContent("");
  }

  async function saveEdit(id: string) {
    if (!editContent.trim()) return;
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/forum/threads/${thread.id}/posts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: editContent }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong.");
      return;
    }

    const { post } = await res.json();
    updateItem(id, (item) => ({ ...item, content: post.content, updatedAt: post.updatedAt }));
    cancelEdit();
  }

  async function deleteItem(id: string) {
    if (!window.confirm("Delete this post? This can't be undone.")) return;
    setError(null);
    const res = await fetch(`/api/forum/threads/${thread.id}/posts/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong.");
      return;
    }
    updateItem(id, (item) => ({ ...item, isDeleted: true, content: "" }));
  }

  async function toggleFlag(flag: "isPinned" | "isLocked", value: boolean) {
    setError(null);
    const res = await fetch(`/api/forum/threads/${thread.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [flag]: value }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong.");
      return;
    }
    if (flag === "isPinned") setIsPinned(value);
    else setIsLocked(value);
  }

  async function deleteThread() {
    if (!window.confirm("Delete this thread? This can't be undone.")) return;
    setError(null);
    const res = await fetch(`/api/forum/threads/${thread.id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong.");
      return;
    }
    setThreadDeleted(true);
    router.push(`/forum/${categorySlug}`);
  }

  function ItemControls({ item }: { item: PostItem }) {
    if (item.isDeleted) return null;
    const canEdit = currentUserId === item.authorId;
    const canDelete = canEdit || isModerator;
    if (!canEdit && !canDelete) return null;

    return (
      <span className="ml-2 inline-flex gap-2">
        {canEdit && (
          <button onClick={() => startEdit(item)} className="text-xs text-neutral-400 hover:text-white">
            Edit
          </button>
        )}
        {canDelete && (
          <button onClick={() => deleteItem(item.id)} className="text-xs text-neutral-400 hover:text-red-400">
            Delete
          </button>
        )}
      </span>
    );
  }

  function ItemBody({ item }: { item: PostItem }) {
    if (item.isDeleted) {
      return <p className="text-sm italic text-neutral-500">[deleted]</p>;
    }

    if (editingId === item.id) {
      return (
        <div className="flex flex-col gap-2">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={2}
            maxLength={MAX_CONTENT_LENGTH}
            className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              onClick={() => saveEdit(item.id)}
              disabled={submitting || !editContent.trim()}
              className="w-fit rounded-md bg-red-700 px-3 py-1 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-50"
            >
              Save
            </button>
            <button
              onClick={cancelEdit}
              className="w-fit rounded-md border border-neutral-700 px-3 py-1 text-xs text-neutral-300 hover:bg-neutral-800"
            >
              Cancel
            </button>
          </div>
        </div>
      );
    }

    return <SpoilerText content={item.content} />;
  }

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-xl font-bold text-white">
            {isPinned && <span className="mr-2 text-sm text-amber-400">📌</span>}
            {thread.title}
          </h1>
          <p className="text-sm text-neutral-500">
            Started by {thread.author.username}
            {isLocked && <span className="ml-2 text-neutral-400">· Locked</span>}
            {threadDeleted && <span className="ml-2 text-red-400">· Deleted</span>}
          </p>
        </div>
        {isModerator && !threadDeleted && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => toggleFlag("isPinned", !isPinned)}
              className="rounded-md border border-neutral-700 px-3 py-1 text-xs text-neutral-300 hover:bg-neutral-800"
            >
              {isPinned ? "Unpin" : "Pin"}
            </button>
            <button
              onClick={() => toggleFlag("isLocked", !isLocked)}
              className="rounded-md border border-neutral-700 px-3 py-1 text-xs text-neutral-300 hover:bg-neutral-800"
            >
              {isLocked ? "Unlock" : "Lock"}
            </button>
            <button
              onClick={deleteThread}
              className="rounded-md border border-neutral-700 px-3 py-1 text-xs text-neutral-300 hover:bg-red-900 hover:text-red-300"
            >
              Delete thread
            </button>
          </div>
        )}
        {!isModerator && currentUserId === thread.authorId && !threadDeleted && (
          <button
            onClick={deleteThread}
            className="rounded-md border border-neutral-700 px-3 py-1 text-xs text-neutral-300 hover:bg-red-900 hover:text-red-300"
          >
            Delete thread
          </button>
        )}
      </div>

      {threadDeleted ? (
        <p className="text-sm text-neutral-500">This thread has been deleted.</p>
      ) : (
        <>
          <ul className="flex flex-col gap-4">
            {posts.map((post) => (
              <li key={post.id} className="rounded-md border border-neutral-800 bg-neutral-900 p-3">
                <div className="mb-1 flex items-center gap-2 text-sm">
                  <span className="font-medium text-neutral-100">{post.author.username}</span>
                  <span className="text-neutral-500">{timeAgo(post.createdAt)}</span>
                  {!post.isDeleted && wasEdited(post) && <span className="text-xs text-neutral-600">(edited)</span>}
                  <ItemControls item={post} />
                </div>
                <ItemBody item={post} />

                {signedIn && !isLocked && !post.isDeleted && (
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
                      maxLength={MAX_CONTENT_LENGTH}
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
                          <span className="font-medium text-neutral-100">{reply.author.username}</span>
                          <span className="text-neutral-500">{timeAgo(reply.createdAt)}</span>
                          {!reply.isDeleted && wasEdited(reply) && (
                            <span className="text-xs text-neutral-600">(edited)</span>
                          )}
                          <ItemControls item={reply} />
                        </div>
                        <ItemBody item={reply} />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
            {posts.length === 0 && <p className="text-sm text-neutral-500">No posts yet.</p>}
          </ul>

          {nextCursor && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="mt-4 w-full rounded-md border border-neutral-800 py-2 text-sm text-neutral-300 hover:bg-neutral-900 disabled:opacity-50"
            >
              {loadingMore ? "Loading…" : "Load more"}
            </button>
          )}

          {signedIn ? (
            !isLocked && (
              <div className="mt-6 flex flex-col gap-2">
                <textarea
                  value={replyToThreadContent}
                  onChange={(e) => setReplyToThreadContent(e.target.value)}
                  placeholder="Reply to this thread… use [spoiler]text[/spoiler] to hide spoilers"
                  rows={3}
                  maxLength={MAX_CONTENT_LENGTH}
                  className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
                />
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => submit(replyToThreadContent, null)}
                    disabled={submitting || !replyToThreadContent.trim()}
                    className="w-fit rounded-md bg-red-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
                  >
                    Post reply
                  </button>
                  <span className="text-xs text-neutral-500">
                    {replyToThreadContent.length}/{MAX_CONTENT_LENGTH}
                  </span>
                </div>
              </div>
            )
          ) : (
            <p className="mt-6 text-sm text-neutral-400">
              <a href="/login" className="text-red-500 hover:underline">
                Sign in
              </a>{" "}
              to reply.
            </p>
          )}
          {isLocked && signedIn && <p className="mt-6 text-sm text-neutral-500">This thread is locked.</p>}
          {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
        </>
      )}
    </section>
  );
}
