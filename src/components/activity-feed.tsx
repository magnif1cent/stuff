import Image from "next/image";
import Link from "next/link";
import { resolvePosterUrl } from "@/lib/tmdb";
import type {
  DiscussionActivityItem,
  FightSceneActivityItem,
  ListActivityItem,
  RecentActivity,
} from "@/lib/activity";

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

function ByLine({ username, createdAt }: { username: string; createdAt: Date }) {
  return (
    <p className="text-xs text-neutral-500">
      <Link href={`/members/${username}`} className="hover:text-red-400">
        {username}
      </Link>{" "}
      · {timeAgo(createdAt)}
    </p>
  );
}

function PosterThumb({ movie }: { movie: { id: string; title: string; posterPath: string | null; posterOverrideUrl: string | null } }) {
  const posterUrl = resolvePosterUrl(movie, "w200");
  return (
    <Link href={`/movies/${movie.id}`} className="shrink-0">
      <div className="relative aspect-2/3 w-10 overflow-hidden rounded bg-neutral-800">
        {posterUrl ? <Image src={posterUrl} alt={movie.title} fill sizes="40px" className="object-cover" /> : null}
      </div>
    </Link>
  );
}

function FightSceneCard({ item }: { item: FightSceneActivityItem }) {
  return (
    <article className="flex gap-2.5 rounded-md border border-neutral-800 bg-neutral-900 p-3">
      <PosterThumb movie={item.movie} />
      <div className="min-w-0">
        <Link href={`/movies/${item.movie.id}`} className="block truncate text-sm font-bold text-white hover:text-red-400">
          {item.sceneTitle}
        </Link>
        <p className="truncate text-xs text-neutral-400">{item.movie.title}</p>
        <ByLine username={item.username} createdAt={item.createdAt} />
      </div>
    </article>
  );
}

function ListCard({ item }: { item: ListActivityItem }) {
  return (
    <article className="rounded-md border border-neutral-800 bg-neutral-900 p-3">
      <Link href={`/lists/${item.listId}`} className="block truncate text-sm font-bold text-white hover:text-red-400">
        {item.listName}
      </Link>
      <ByLine username={item.username} createdAt={item.createdAt} />
    </article>
  );
}

function DiscussionCard({ item }: { item: DiscussionActivityItem }) {
  return (
    <article className="flex gap-2.5 rounded-md border border-neutral-800 bg-neutral-900 p-3">
      <PosterThumb movie={item.movie} />
      <div className="min-w-0">
        <Link href={`/movies/${item.movie.id}#discussion`} className="block truncate text-sm font-bold text-white hover:text-red-400">
          {item.movie.title}
        </Link>
        <p className="truncate text-xs text-neutral-400">{item.excerpt}</p>
        <ByLine username={item.username} createdAt={item.createdAt} />
      </div>
    </article>
  );
}

function ActivityColumn({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-red-500">{label}</p>
      {children}
    </div>
  );
}

export function ActivityFeed({ activity }: { activity: RecentActivity }) {
  const { fightScenes, lists, discussions } = activity;
  if (fightScenes.length === 0 && lists.length === 0 && discussions.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8">
      <h2 className="mb-4 font-serif text-xl font-bold text-white">Community Activity</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {fightScenes.length > 0 && (
          <ActivityColumn label="Fight Scenes">
            {fightScenes.map((item) => (
              <FightSceneCard key={item.id} item={item} />
            ))}
          </ActivityColumn>
        )}
        {lists.length > 0 && (
          <ActivityColumn label="New Lists">
            {lists.map((item) => (
              <ListCard key={item.id} item={item} />
            ))}
          </ActivityColumn>
        )}
        {discussions.length > 0 && (
          <ActivityColumn label="Discussions">
            {discussions.map((item) => (
              <DiscussionCard key={item.id} item={item} />
            ))}
          </ActivityColumn>
        )}
      </div>
    </section>
  );
}
