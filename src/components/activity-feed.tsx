import Link from "next/link";
import type { ActivityItem } from "@/lib/activity";

function timeAgo(date: Date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const linkClass = "text-neutral-300 underline decoration-neutral-700 underline-offset-2 hover:text-red-400";

function ActivityDescription({ item }: { item: ActivityItem }) {
  switch (item.type) {
    case "FIGHT_SCENE":
      return (
        <>
          tagged a new fight scene in{" "}
          <Link href={`/movies/${item.movieId}`} className={linkClass}>
            {item.movieTitle}
          </Link>
        </>
      );
    case "LIST":
      return (
        <>
          created a new list{" "}
          <Link href={`/lists/${item.listId}`} className={linkClass}>
            &ldquo;{item.listName}&rdquo;
          </Link>
        </>
      );
    case "DISCUSSION":
      return (
        <>
          started a discussion on{" "}
          <Link href={`/movies/${item.movieId}#discussion`} className={linkClass}>
            {item.movieTitle}
          </Link>
        </>
      );
  }
}

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8">
      <h2 className="mb-4 font-serif text-xl font-bold text-white">Community Activity</h2>
      <div className="divide-y divide-neutral-800 border-y border-neutral-800">
        {items.map((item) => (
          <div key={`${item.type}-${item.id}`} className="flex items-center justify-between gap-3 py-2.5 text-sm">
            <p className="min-w-0 truncate text-neutral-300">
              <Link href={`/members/${item.username}`} className="font-medium text-white hover:text-red-400">
                {item.username}
              </Link>{" "}
              <ActivityDescription item={item} />
            </p>
            <span className="shrink-0 text-xs text-neutral-500">{timeAgo(item.createdAt)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
