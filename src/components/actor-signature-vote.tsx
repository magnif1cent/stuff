"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { resolvePosterUrl, isTmdbUrl } from "@/lib/tmdb";
import { YoutubeThumbnailImage } from "@/components/fight-scene-thumbnail";

// Below this many combined votes in a category, no leader is shown --
// avoids crowning a "Signature" answer off a couple of clicks, one that
// could flip on the very next vote cast.
const SIGNATURE_VOTE_MINIMUM = 5;

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

function pickLeader(votes: Record<string, number>) {
  let best: { id: string; votes: number } | null = null;
  let total = 0;
  for (const [id, v] of Object.entries(votes)) {
    total += v;
    if (!best || v > best.votes) best = { id, votes: v };
  }
  if (!best || total < SIGNATURE_VOTE_MINIMUM) return null;
  return { ...best, total };
}

// Two independent crowd-sourced answers to "what should this actor be
// remembered for" -- Signature Role (the movie with the most votes) and
// Signature Fight Scene (the fight scene with the most votes), each judged
// only against others in its own category, not against each other. Shown
// side by side when both clear the vote minimum; either can appear alone.
export function SignatureSpotlight() {
  const { movieVotes, fightSceneVotes, movies, fightScenes } = useSignatureVote();

  const movieLeader = useMemo(() => pickLeader(movieVotes), [movieVotes]);
  const fightSceneLeader = useMemo(() => pickLeader(fightSceneVotes), [fightSceneVotes]);

  const movie = movieLeader ? movies.find((m) => m.id === movieLeader.id) : undefined;
  const scene = fightSceneLeader ? fightScenes.find((s) => s.id === fightSceneLeader.id) : undefined;
  const moviePosterUrl = movie ? resolvePosterUrl(movie, "w342") : null;

  if (!movie && !scene) return null;

  return (
    <div className="mb-10 flex flex-col gap-4 sm:flex-row">
      {movie && movieLeader && (
        <SpotlightCard
          className="sm:flex-1"
          href={`/movies/${movie.id}`}
          kicker="Signature Role"
          title={movie.title}
          meta={movie.year ? `${movie.year}` : undefined}
          votes={movieLeader.votes}
          share={Math.round((movieLeader.votes / movieLeader.total) * 100)}
          imageClassName="aspect-2/3 w-16"
          image={
            moviePosterUrl ? (
              <Image
                src={moviePosterUrl}
                alt={movie.title}
                fill
                unoptimized={isTmdbUrl(moviePosterUrl)}
                sizes="64px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center px-1 text-center text-[10px] text-neutral-500">
                {movie.title}
              </div>
            )
          }
        />
      )}
      {scene && fightSceneLeader && (
        <SpotlightCard
          className="sm:flex-1"
          href={`/movies/${scene.movieId}/fights/${scene.id}`}
          kicker="Signature Fight Scene"
          title={scene.title}
          meta={`from ${scene.movieTitle}`}
          votes={fightSceneLeader.votes}
          share={Math.round((fightSceneLeader.votes / fightSceneLeader.total) * 100)}
          imageClassName="aspect-video w-40"
          image={<YoutubeThumbnailImage videoId={scene.youtubeVideoId} title={scene.title} />}
        />
      )}
    </div>
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
  className = "",
}: {
  href: string;
  kicker: string;
  title: string;
  meta?: string;
  votes: number;
  share: number;
  image: ReactNode;
  imageClassName: string;
  className?: string;
}) {
  return (
    <div
      className={`flex gap-4 rounded-md border border-neutral-800 border-l-4 border-l-yellow-500 bg-neutral-900 p-4 ${className}`}
    >
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
// already on the page -- casts or retracts this member's pick for that
// category (movie picks and fight scene picks are independent, see
// SignatureSpotlight above) without a separate list of every credit to
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
