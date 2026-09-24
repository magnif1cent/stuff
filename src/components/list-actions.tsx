"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MemberList } from "@/generated/prisma/client";

// Everything you can *do* to a list on its own page, gathered into one place
// (see DECISIONS.md, "List page actions moved into one side panel"): a
// side panel at lg:+, and a compact row plus a bottom sheet below that.
// Both render from the same props and share their fetch logic through
// useListActions, so the two layouts can't drift apart in behavior.

export type ListActionsProps = Pick<MemberList, "isPrivate"> & {
  listId: string;
  isOwner: boolean;
  ownerUsername: string;
  likeCount: number;
  itemCount: number;
  initialLiked: boolean;
  signedIn: boolean;
};

function useListActions({ listId, ownerUsername, likeCount: initialLikeCount, initialLiked, signedIn }: ListActionsProps) {
  const router = useRouter();
  const [busy, setBusy] = useState<"privacy" | "delete" | "like" | "clone" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function setPrivate(next: boolean) {
    setBusy("privacy");
    setError(null);
    const res = await fetch(`/api/lists/${listId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPrivate: next }),
    });
    setBusy(null);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Couldn't update privacy.");
      return;
    }
    router.refresh();
  }

  async function copyLink() {
    setError(null);
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/lists/${listId}`);
      setCopied(true);
    } catch {
      setError("Couldn't copy the link. Copy it from the address bar instead.");
    }
  }

  async function deleteList() {
    if (!window.confirm("Delete this list? This can't be undone.")) return;
    setBusy("delete");
    setError(null);
    const res = await fetch(`/api/lists/${listId}`, { method: "DELETE" });
    if (!res.ok) {
      setBusy(null);
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Couldn't delete this list.");
      return;
    }
    router.push(`/members/${ownerUsername}`);
  }

  async function toggleLike() {
    if (!signedIn) {
      router.push("/login");
      return;
    }
    setBusy("like");
    setError(null);
    const res = await fetch(`/api/lists/${listId}/like`, { method: "POST" });
    setBusy(null);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong.");
      return;
    }
    const { active, likeCount: count } = await res.json();
    setLiked(active);
    setLikeCount(count);
    router.refresh();
  }

  async function cloneList() {
    if (!signedIn) {
      router.push("/login");
      return;
    }
    setBusy("clone");
    setError(null);
    const res = await fetch(`/api/lists/${listId}/clone`, { method: "POST" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBusy(null);
      setError(body.error ?? "Couldn't clone this list.");
      return;
    }
    router.push(`/lists/${body.list.id}`);
  }

  return { busy, error, copied, liked, likeCount, setPrivate, copyLink, deleteList, toggleLike, cloneList };
}

type Actions = ReturnType<typeof useListActions>;

function Icon({ d, className = "h-4 w-4" }: { d: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      <path d={d} />
    </svg>
  );
}

const ICONS = {
  lock: "M6 11h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1ZM8 11V7a4 4 0 0 1 8 0v4",
  globe: "M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18ZM3 12h18M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18",
  pencil: "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z",
  link: "M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7",
  trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  clone: "M10 8h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2ZM16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3",
  heart: "M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.1 0 3.6 1.1 5.3 3 1.7-1.9 3.2-3 5.3-3 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21Z",
  chevron: "m9 6 6 6-6 6",
  dots: "M5 12h.01M12 12h.01M19 12h.01",
};

const ROW =
  "flex min-h-11 w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-neutral-100 transition hover:bg-neutral-800 disabled:opacity-50";

// The owner's and a visitor's action rows, shared verbatim by the side panel
// and the mobile sheet — only the surrounding chrome differs between them.
function ActionRows({ props, actions, onDone }: { props: ListActionsProps; actions: Actions; onDone?: () => void }) {
  const { listId, isOwner, isPrivate, itemCount } = props;
  const { busy, copied } = actions;

  if (isOwner) {
    return (
      <>
        <Link href={`/lists/${listId}/edit`} className={ROW}>
          <Icon d={ICONS.pencil} className="h-4 w-4 text-neutral-400" />
          <span className="flex-1">Edit list</span>
          <Icon d={ICONS.chevron} className="h-3.5 w-3.5 text-neutral-500" />
        </Link>
        <button
          type="button"
          disabled={busy === "privacy"}
          onClick={async () => {
            await actions.setPrivate(!isPrivate);
            onDone?.();
          }}
          className={`${ROW} items-start`}
        >
          <Icon d={isPrivate ? ICONS.globe : ICONS.lock} className="mt-0.5 h-4 w-4 text-neutral-400" />
          <span className="flex flex-col gap-0.5">
            <span>
              {busy === "privacy" ? "Saving…" : isPrivate ? "Make this list public" : "Make this list private"}
            </span>
            <span className="text-xs leading-snug text-neutral-500">
              {isPrivate
                ? "Anyone with the link can view it, and it shows on /lists."
                : "Hide it from everyone but you."}
            </span>
          </span>
        </button>
        {!isPrivate && (
          <button type="button" onClick={actions.copyLink} className={ROW}>
            <Icon d={ICONS.link} className="h-4 w-4 text-neutral-400" />
            <span>{copied ? "Link copied" : "Copy link"}</span>
          </button>
        )}
      </>
    );
  }

  return (
    <>
      {itemCount > 0 && (
        <button type="button" disabled={busy === "clone"} onClick={actions.cloneList} className={`${ROW} items-start`}>
          <Icon d={ICONS.clone} className="mt-0.5 h-4 w-4 text-neutral-400" />
          <span className="flex flex-col gap-0.5">
            <span>{busy === "clone" ? "Cloning…" : "Clone this list"}</span>
            <span className="text-xs text-neutral-500">Make your own editable copy</span>
          </span>
        </button>
      )}
      <button type="button" onClick={actions.copyLink} className={ROW}>
        <Icon d={ICONS.link} className="h-4 w-4 text-neutral-400" />
        <span>{copied ? "Link copied" : "Copy link"}</span>
      </button>
    </>
  );
}

function DeleteRow({ actions }: { actions: Actions }) {
  return (
    <button
      type="button"
      disabled={actions.busy === "delete"}
      onClick={actions.deleteList}
      className={`${ROW} text-[13px] text-red-400 hover:bg-red-950/40`}
    >
      <Icon d={ICONS.trash} className="h-4 w-4" />
      <span>{actions.busy === "delete" ? "Deleting…" : "Delete list…"}</span>
    </button>
  );
}

function LikeButton({ actions, className }: { actions: Actions; className: string }) {
  return (
    <button
      type="button"
      aria-pressed={actions.liked}
      disabled={actions.busy === "like"}
      onClick={actions.toggleLike}
      className={`flex items-center justify-center gap-2 text-sm font-semibold transition disabled:opacity-60 ${className} ${
        actions.liked
          ? "border-red-900 bg-red-950 text-red-400"
          : "border-neutral-700 bg-neutral-800 text-neutral-100 hover:border-neutral-600"
      }`}
    >
      <svg viewBox="0 0 24 24" fill={actions.liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" aria-hidden="true" className="h-4 w-4">
        <path d={ICONS.heart} />
      </svg>
      {actions.liked ? "Liked" : "Like this list"}
    </button>
  );
}

function Stats({ likeCount, itemCount }: { likeCount: number; itemCount: number }) {
  return (
    <div className="flex gap-4 text-xs text-neutral-500">
      <span className="inline-flex items-center gap-1.5">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-3 w-3 text-red-400">
          <path d={ICONS.heart} />
        </svg>
        <span className="font-semibold text-neutral-100">{likeCount}</span> {likeCount === 1 ? "like" : "likes"}
      </span>
      <span>
        <span className="font-semibold text-neutral-100">{itemCount}</span> {itemCount === 1 ? "item" : "items"}
      </span>
    </div>
  );
}

function PrivacyStatus({ isPrivate }: { isPrivate: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-neutral-600 bg-neutral-700 text-neutral-100">
        <Icon d={isPrivate ? ICONS.lock : ICONS.globe} />
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-semibold text-white">{isPrivate ? "Private list" : "Public list"}</span>
        <span className="text-xs text-neutral-500">
          {isPrivate ? "Only you can see this list" : "Anyone with the link can view it"}
        </span>
      </div>
    </div>
  );
}

export function ListActionsPanel(props: ListActionsProps) {
  const actions = useListActions(props);
  const { isOwner, isPrivate, itemCount } = props;

  return (
    <aside
      aria-label="List actions"
      className="flex w-full flex-col overflow-hidden rounded-lg border border-neutral-700 bg-neutral-900"
    >
      <div
        className={`flex flex-col gap-3 border-b border-neutral-700 p-4 ${isOwner && isPrivate ? "bg-neutral-800" : ""}`}
      >
        {isOwner ? <PrivacyStatus isPrivate={isPrivate} /> : <LikeButton actions={actions} className="min-h-11 rounded-lg border" />}
        <Stats likeCount={actions.likeCount} itemCount={itemCount} />
      </div>
      <div className="flex flex-col gap-0.5 p-1.5">
        <ActionRows props={props} actions={actions} />
      </div>
      {isOwner && (
        <div className="border-t border-neutral-800 p-1.5">
          <DeleteRow actions={actions} />
        </div>
      )}
      {actions.error && <p className="border-t border-neutral-800 px-4 py-3 text-xs text-red-500">{actions.error}</p>}
    </aside>
  );
}

// Below lg: a visitor keeps a visible Like button (their main action) next
// to a ⋯ button; the owner gets only the ⋯ button. Either opens a bottom
// sheet holding the same rows as the desktop panel.
export function ListActionsMobile(props: ListActionsProps) {
  const actions = useListActions(props);
  const [open, setOpen] = useState(false);
  const { isOwner, isPrivate } = props;

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <div className="flex items-center gap-2">
        {!isOwner && <LikeButton actions={actions} className="min-h-11 flex-1 rounded-full border px-4" />}
        <button
          type="button"
          aria-label="List actions"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-neutral-700 bg-neutral-900 text-neutral-200 hover:border-neutral-600"
        >
          <Icon d={ICONS.dots} className="h-5 w-5" />
        </button>
      </div>
      {!open && actions.error && <p className="mt-2 text-xs text-red-500">{actions.error}</p>}

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/70"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="List actions"
            className="absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col overflow-y-auto rounded-t-2xl border-t border-neutral-700 bg-neutral-900 px-2 pt-2 pb-6"
          >
            <div aria-hidden="true" className="mx-auto mt-1 mb-3 h-1 w-9 rounded-full bg-neutral-600" />
            {isOwner && (
              <div className="mx-2 mb-2 rounded-lg bg-neutral-800 p-3">
                <PrivacyStatus isPrivate={isPrivate} />
              </div>
            )}
            <div className="flex flex-col gap-0.5 [&>*]:min-h-13 [&>*]:text-base">
              <ActionRows props={props} actions={actions} onDone={() => setOpen(false)} />
              {isOwner && <DeleteRow actions={actions} />}
            </div>
            {actions.error && <p className="px-3 pt-2 text-xs text-red-500">{actions.error}</p>}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-2 min-h-12 rounded-xl border border-neutral-700 bg-neutral-950 text-[15px] font-semibold text-neutral-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
