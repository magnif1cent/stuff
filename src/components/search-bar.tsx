"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { tmdbImageUrl } from "@/lib/tmdb";

interface SearchResult {
  id: string;
  title: string;
  releaseDate: string | null;
  posterPath: string | null;
}

const DEBOUNCE_MS = 250;

export function SearchBar({ initialQuery = "" }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const containerRef = useRef<HTMLFormElement>(null);
  const requestId = useRef(0);
  const router = useRouter();

  useEffect(() => {
    const trimmed = query.trim();
    // Nothing to fetch — rendering already hides the dropdown for an empty
    // query, so stale `results` left over from a prior query is harmless.
    if (!trimmed) return;

    const id = ++requestId.current;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
        if (!res.ok || requestId.current !== id) return;
        const data = await res.json();
        setResults(data.results ?? []);
      } catch {
        if (requestId.current === id) setResults([]);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const goToSearchPage = () => {
    const trimmed = query.trim();
    setOpen(false);
    router.push(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/search");
  };

  const visibleResults = query.trim() ? results : [];
  const optionCount = visibleResults.length + (visibleResults.length > 0 ? 1 : 0); // +1 for "see all"
  const listboxId = "search-results-listbox";

  return (
    <form
      ref={containerRef}
      role="combobox"
      aria-expanded={open && optionCount > 0}
      aria-haspopup="listbox"
      aria-controls={listboxId}
      onSubmit={(e) => {
        e.preventDefault();
        goToSearchPage();
      }}
      className="relative w-full max-w-md"
    >
      <div className="flex w-full items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setHighlighted(-1);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (optionCount === 0) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHighlighted((h) => (h + 1) % optionCount);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlighted((h) => (h - 1 + optionCount) % optionCount);
            } else if (e.key === "Escape") {
              setOpen(false);
            } else if (e.key === "Enter" && highlighted >= 0 && highlighted < visibleResults.length) {
              e.preventDefault();
              setOpen(false);
              router.push(`/movies/${visibleResults[highlighted].id}`);
            }
          }}
          aria-autocomplete="list"
          placeholder="Search movies or actors…"
          className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-red-600 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-md bg-red-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-600"
        >
          Search
        </button>
      </div>

      {open && optionCount > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute left-0 top-full z-30 mt-2 w-full overflow-hidden rounded-md border border-neutral-800 bg-neutral-900 shadow-xl"
        >
          {visibleResults.map((movie, i) => {
            const posterUrl = tmdbImageUrl(movie.posterPath, "w200");
            const year = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : null;
            return (
              <li key={movie.id} role="option" aria-selected={highlighted === i}>
                <Link
                  href={`/movies/${movie.id}`}
                  onClick={() => setOpen(false)}
                  onMouseEnter={() => setHighlighted(i)}
                  className={`flex items-center gap-3 px-3 py-2 text-sm ${
                    highlighted === i ? "bg-neutral-800" : ""
                  }`}
                >
                  <div className="relative h-10 w-7 shrink-0 overflow-hidden rounded-sm bg-neutral-800">
                    {posterUrl && (
                      <Image src={posterUrl} alt="" fill sizes="28px" className="object-cover" />
                    )}
                  </div>
                  <span className="truncate text-neutral-100">
                    {movie.title} {year && <span className="text-neutral-500">({year})</span>}
                  </span>
                </Link>
              </li>
            );
          })}
          <li role="option" aria-selected={highlighted === visibleResults.length}>
            <button
              type="button"
              onClick={goToSearchPage}
              onMouseEnter={() => setHighlighted(visibleResults.length)}
              className={`w-full px-3 py-2 text-left text-sm text-red-500 hover:underline ${
                highlighted === visibleResults.length ? "bg-neutral-800" : ""
              }`}
            >
              See all results for &ldquo;{query.trim()}&rdquo;
            </button>
          </li>
        </ul>
      )}
    </form>
  );
}
