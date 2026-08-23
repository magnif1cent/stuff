"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { resolvePosterUrl } from "@/lib/tmdb";
import { YoutubeThumbnailImage } from "@/components/fight-scene-thumbnail";

// TEMPORARY, for preview review only: dropped from 5 to 1 so a single vote
// is enough to see the banner on a preview deployment with no real vote
// history yet. Revert to 5 before this merges -- see DECISIONS.md/README
// for why 5 is the real value.
const SIGNATURE_VOTE_MINIMUM = 1;

export interface SignatureMovieOption {
  id: string;
  title: string;
  year: number | null;
  posterPath: string | null;
  posterOverrideUrl: string | null;
}

export interface SignatureFightSceneOption {
  id: string;
  title: string;
  youtubeVideoId: string;
  movieId: string;
  movieTitle: string;
}

export interface SignatureMyVote {
  movieId: string | null;
  fightSceneId: string | null;
}

interface VoteCounts {
  movieVotes: Record<string, number>;
  fightSceneVotes: Record<string, number>;
}

interface SignatureVoteContextValue extends VoteCounts {
  movies: SignatureMovieOption[];
  fightScenes: SignatureFightSceneOption[];
  myVote: SignatureMyVote | null;
  pending: boolean;
  vote: (choice: { movieId?: string; fightSceneId?: string }) => void;
}

const SignatureVoteContext = createContext<SignatureVoteContextValue | null>(null);

function useSignatureVote() {
  const ctx = useContext(SignatureVoteContext);
  if (!ctx) throw new Error("Signature vote components must be rendered within a SignatureVoteProvider");
  return ctx;
}

// Shares vote tallies + the current user's pick between the spotlight
// banner and the per-card vote buttons scattered through the Filmography
// and Fight Scenes grids further down the page -- they all need to agree
// on the same numbers the moment one of them changes.
export function SignatureVoteProvider({
  personId,
  signedIn,
  movies,
  fightScenes,
  initialMovieVotes,
  initialFightSceneVotes,
  initialMyVote,
  children,
}: {
  personId: string;
  signedIn: boolean;
  movies: SignatureMovieOption[];
  fightScenes: SignatureFightSceneOption[];
  initialMovieVotes: Record<string, number>;
  initialFightSceneVotes: Record<string, number>;
  initialMyVote: SignatureMyVote | null;
  children: ReactNode;
}) {
  const [counts, setCounts] = useState<VoteCounts>({
    movieVotes: initialMovieVotes,
    fightSceneVotes: initialFightSceneVotes,
  });
  const [myVote, setMyVote] = useState<SignatureMyVote | null>(initialMyVote);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function vote(choice: { movieId?: string; fightSceneId?: string }) {
    if (!signedIn) {
      router.push("/login");
      return;
    }
    if (pending) return;
    setPending(true);
    try {
      const res = await fetch(`/api/actors/${personId}/signature-vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(choice),
      });
      if (!res.ok) return;
      const data = await res.json();
      setCounts((prev) => {
        const movieVotes = { ...prev.movieVotes };
        for (const c of data.movieCounts as { id: string; votes: number }[]) movieVotes[c.id] = c.votes;
        const fightSceneVotes = { ...prev.fightSceneVotes };
        for (const c of data.fightSceneCounts as { id: string; votes: number }[]) fightSceneVotes[c.id] = c.votes;
        return { movieVotes, fightSceneVotes };
      });
      setMyVote(data.myVote);
    } finally {
      setPending(false);
    }
  }

  return (
    <SignatureVoteContext.Provider
      value={{ movies, fightScenes, myVote, pending, vote, ...counts }}
    >
      {children}
    </SignatureVoteContext.Provider>
  );
}

// The crowd-sourced answer to "what should this actor be remembered for" --
// whichever single movie or fight scene has the most signature votes,
// combined across both categories (see the PersonSignatureVote model
// comment in schema.prisma for why that combination is the point).
export function SignatureSpotlight() {
  const { movieVotes, fightSceneVotes, movies, fightScenes } = useSignatureVote();

  const leader = useMemo(() => {
    let best: { kind: "movie" | "fightScene"; id: string; votes: number } | null = null;
    let total = 0;
    for (const [id, votes] of Object.entries(movieVotes)) {
      total += votes;
      if (!best || votes > best.votes) best = { kind: "movie", id, votes };
    }
    for (const [id, votes] of Object.entries(fightSceneVotes)) {
      total += votes;
      if (!best || votes > best.votes) best = { kind: "fightScene", id, votes };
    }
    if (!best || total < SIGNATURE_VOTE_MINIMUM) return null;
    return { ...best, total };
  }, [movieVotes, fightSceneVotes]);

  if (!leader) return null;

  const share = Math.round((leader.votes / leader.total) * 100);

  if (leader.kind === "movie") {
    const movie = movies.find((m) => m.id === leader.id);
    if (!movie) return null;
    const posterUrl = resolvePosterUrl(movie, "w342");
    return (
      <SpotlightCard
        href={`/movies/${movie.id}`}
        kicker="Signature Role"
        title={movie.title}
        meta={movie.year ? `${movie.year}` : undefined}
        votes={leader.votes}
        share={share}
        imageClassName="aspect-2/3 w-16"
        image={
          posterUrl ? (
            <Image src={posterUrl} alt={movie.title} fill sizes="64px" className="object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center px-1 text-center text-[10px] text-neutral-500">
              {movie.title}
            </div>
          )
        }
      />
    );
  }

  const scene = fightScenes.find((s) => s.id === leader.id);
  if (!scene) return null;
  return (
    <SpotlightCard
      href={`/movies/${scene.movieId}/fight-scenes/${scene.id}`}
      kicker="Signature Fight Scene"
      title={scene.title}
      meta={`from ${scene.movieTitle}`}
      votes={leader.votes}
      share={share}
      imageClassName="aspect-video w-40"
      image={<YoutubeThumbnailImage videoId={scene.youtubeVideoId} title={scene.title} />}
    />
  );
}

function SpotlightCard({
  href,
  kicker,
  title,
  meta,
  votes,
  share,
  image,
  imageClassName,
}: {
  href: string;
  kicker: string;
  title: string;
  meta?: string;
  votes: number;
  share: number;
  image: ReactNode;
  imageClassName: string;
}) {
  return (
    <div className="mb-10 flex gap-4 rounded-md border border-neutral-800 border-l-4 border-l-yellow-500 bg-neutral-900 p-4">
      <Link href={href} className={`relative shrink-0 overflow-hidden rounded-md bg-neutral-950 ${imageClassName}`}>
        {image}
      </Link>
      <div className="min-w-0">
        <span className="inline-flex w-fit items-center gap-1 rounded-full border border-yellow-500/40 bg-yellow-500/10 px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-yellow-500 uppercase">
          🏆 {kicker}
        </span>
        <Link href={href} className="mt-1.5 block truncate text-lg font-bold text-white hover:text-yellow-500">
          {title}
        </Link>
        {meta && <p className="truncate text-sm text-neutral-400">{meta}</p>}
        <div className="mt-2 flex items-center gap-2">
          <div className="h-1.5 w-40 max-w-full overflow-hidden rounded-full bg-neutral-800">
            <div className="h-full rounded-full bg-yellow-500" style={{ width: `${share}%` }} />
          </div>
          <span className="shrink-0 text-xs text-neutral-500">
            <span className="font-semibold text-neutral-300">{votes}</span> votes &middot; {share}%
          </span>
        </div>
      </div>
    </div>
  );
}

// Small corner toggle rendered on top of each movie/fight-scene card
// already on the page -- casts (or retracts, or switches) this member's one
// signature vote for the actor without a separate list of every credit to
// vote on, which wouldn't scale for an actor with a long filmography.
export function SignatureVoteButton({ kind, id }: { kind: "movie" | "fightScene"; id: string }) {
  const { movieVotes, fightSceneVotes, myVote, pending, vote } = useSignatureVote();
  const votes = kind === "movie" ? (movieVotes[id] ?? 0) : (fightSceneVotes[id] ?? 0);
  const isMine = kind === "movie" ? myVote?.movieId === id : myVote?.fightSceneId === id;
  const label = kind === "movie" ? "signature role" : "signature fight scene";

  return (
    <button
      onClick={() => vote(kind === "movie" ? { movieId: id } : { fightSceneId: id })}
      disabled={pending}
      title={isMine ? `Remove your ${label} vote` : `Vote as this actor's ${label}`}
      className={`flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
        isMine
          ? "border-yellow-500 bg-yellow-500 text-neutral-950"
          : "border-neutral-700 bg-neutral-950/80 text-neutral-300 hover:border-yellow-500 hover:text-yellow-500"
      }`}
    >
      🏆 {votes}
    </button>
  );
}
