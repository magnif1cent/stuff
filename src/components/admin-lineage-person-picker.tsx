"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { tmdbImageUrl } from "@/lib/tmdb";

export interface PersonRef {
  id: string;
  name: string;
  profilePath: string | null;
}

const DEBOUNCE_MS = 250;

export function AdminLineagePersonPicker({
  value,
  onChange,
  placeholder,
  excludeId,
}: {
  value: PersonRef | null;
  onChange: (person: PersonRef) => void;
  placeholder?: string;
  excludeId?: string;
}) {
  // No effect syncing `query` from `value`: callers that need the input's
  // text to reset when `value` is cleared/replaced from outside (a save
  // completing, a tree node click re-centering) pass a `key` derived from
  // `value?.id` so React remounts this component instead -- avoids the
  // "setState synchronously in an effect" anti-pattern for what's really a
  // reinitialize-on-identity-change case.
  const [query, setQuery] = useState(value?.name ?? "");
  const [results, setResults] = useState<PersonRef[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const trimmedQuery = query.trim();
  const searchTerm = trimmedQuery && trimmedQuery !== value?.name ? trimmedQuery : null;

  useEffect(() => {
    if (!searchTerm) return;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/lineage/search?q=${encodeURIComponent(searchTerm)}`);
        if (!res.ok) return;
        const data = await res.json();
        setResults((data.people ?? []).filter((p: PersonRef) => p.id !== excludeId));
      } catch {
        setResults([]);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchTerm, excludeId]);

  const visibleResults = searchTerm ? results : [];

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder ?? "Search actors…"}
        className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
      />
      {open && visibleResults.length > 0 && (
        <ul className="absolute top-full left-0 z-20 mt-1 w-full overflow-hidden rounded-md border border-neutral-800 bg-neutral-950 shadow-xl">
          {visibleResults.map((person) => (
            <li key={person.id}>
              <button
                type="button"
                onClick={() => {
                  onChange(person);
                  setQuery(person.name);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-neutral-200 hover:bg-neutral-800"
              >
                <span className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full bg-neutral-800">
                  {person.profilePath && (
                    <Image
                      src={tmdbImageUrl(person.profilePath, "w200") ?? ""}
                      alt=""
                      fill
                      unoptimized
                      sizes="24px"
                      className="object-cover"
                    />
                  )}
                </span>
                {person.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
