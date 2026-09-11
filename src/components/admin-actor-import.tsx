"use client";

import { useState } from "react";
import Image from "next/image";
import { tmdbImageUrl, type TmdbPersonSearchResult } from "@/lib/tmdb";
import { TMDB_COUNTRY_OPTIONS } from "@/lib/tmdb-country-options";
import { useTmdbDiscoverImport, type TmdbDiscoverPage } from "@/hooks/use-tmdb-discover-import";
import { TmdbDiscoverResults } from "@/components/tmdb-discover-results";

export function AdminActorImport() {
  const [personQuery, setPersonQuery] = useState("");
  const [personOptions, setPersonOptions] = useState<TmdbPersonSearchResult[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<TmdbPersonSearchResult | null>(null);
  const [searchingPeople, setSearchingPeople] = useState(false);
  const [country, setCountry] = useState("");

  const discover = useTmdbDiscoverImport(async (targetPage) => {
    if (!selectedPerson) return { ok: false, error: "Find and select an actor first." };
    const countryQuery = country ? `&country=${country}` : "";
    const res = await fetch(
      `/api/admin/tmdb/discover?personId=${selectedPerson.id}&page=${targetPage}${countryQuery}`,
    );
    const body = await res.json();
    if (!res.ok) return { ok: false, error: body.error ?? "Search failed." };
    return { ok: true, data: body as TmdbDiscoverPage };
  });

  async function handlePersonSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!personQuery.trim()) return;
    setSearchingPeople(true);
    const res = await fetch(`/api/admin/tmdb/people/search?q=${encodeURIComponent(personQuery)}`);
    const body = await res.json();
    setSearchingPeople(false);
    if (res.ok) setPersonOptions(body.people);
  }

  function selectPerson(person: TmdbPersonSearchResult) {
    setSelectedPerson(person);
    setPersonOptions([]);
    setPersonQuery("");
  }

  return (
    <div>
      <form onSubmit={handlePersonSearch} className="mb-2 flex gap-2">
        <input
          type="text"
          value={personQuery}
          onChange={(e) => setPersonQuery(e.target.value)}
          placeholder="Find an actor (e.g. Jackie Chan)"
          className="w-full max-w-md rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
        />
        <button
          type="submit"
          disabled={searchingPeople}
          className="rounded-md border border-neutral-700 px-4 py-2 text-sm text-neutral-100 hover:bg-neutral-800 disabled:opacity-50"
        >
          {searchingPeople ? "Searching…" : "Find actor"}
        </button>
      </form>

      {personOptions.length > 0 && (
        <ul className="mb-4 flex flex-wrap gap-2">
          {personOptions.map((person) => {
            const photoUrl = tmdbImageUrl(person.profile_path, "w200");
            return (
              <li key={person.id}>
                <button
                  onClick={() => selectPerson(person)}
                  className="flex items-center gap-2 rounded-full border border-neutral-700 py-1 pr-3 pl-1 text-xs text-neutral-300 hover:bg-neutral-800"
                >
                  <span className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full bg-neutral-800">
                    {photoUrl && <Image src={photoUrl} alt="" fill unoptimized sizes="24px" className="object-cover" />}
                  </span>
                  {person.name}
                  {person.known_for_department && (
                    <span className="text-neutral-500">· {person.known_for_department}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {selectedPerson && (
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="text-xs text-neutral-500">Filming with:</span>
          <span className="flex items-center gap-1 rounded-full bg-red-700/20 px-3 py-1 text-xs text-red-400">
            {selectedPerson.name}
            <button
              onClick={() => setSelectedPerson(null)}
              className="text-red-400 hover:text-white"
              aria-label={`Remove ${selectedPerson.name}`}
            >
              ×
            </button>
          </span>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-1.5 text-xs text-neutral-500">
          Country
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs text-neutral-100 focus:border-red-600 focus:outline-none"
          >
            {TMDB_COUNTRY_OPTIONS.map((option) => (
              <option key={option.code} value={option.code}>
                {option.name}
              </option>
            ))}
          </select>
        </label>

        <button
          onClick={discover.search}
          disabled={discover.loading || !selectedPerson}
          className="rounded-md bg-red-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
        >
          {discover.loading ? "Searching…" : "Search movies"}
        </button>
      </div>

      {discover.message && <p className="mb-4 text-sm text-neutral-300">{discover.message}</p>}

      <TmdbDiscoverResults discover={discover} />
    </div>
  );
}
