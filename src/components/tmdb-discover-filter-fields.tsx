"use client";

import type { ReactNode } from "react";
import { TMDB_COUNTRY_OPTIONS } from "@/lib/tmdb-country-options";
import type { useTmdbDiscoverFilters } from "@/hooks/use-tmdb-discover-filters";

// Country + release-year-range controls shared by the "By keyword" and "By
// actor" import tabs. `children` renders inline after the fields (each
// caller's own "Search movies" button), so both stay in one wrapping row.
export function TmdbDiscoverFilterFields({
  filters,
  children,
}: {
  filters: ReturnType<typeof useTmdbDiscoverFilters>;
  children?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <label className="flex items-center gap-1.5 text-xs text-neutral-500">
        Country
        <select
          value={filters.country}
          onChange={(e) => filters.setCountry(e.target.value)}
          className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs text-neutral-100 focus:border-red-600 focus:outline-none"
        >
          {TMDB_COUNTRY_OPTIONS.map((option) => (
            <option key={option.code} value={option.code}>
              {option.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-1.5 text-xs text-neutral-500">
        Year
        <input
          type="number"
          inputMode="numeric"
          placeholder="From"
          value={filters.yearFrom}
          onChange={(e) => filters.setYearFrom(e.target.value)}
          className="w-20 rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs text-neutral-100 focus:border-red-600 focus:outline-none"
        />
        <span className="text-neutral-600">–</span>
        <input
          type="number"
          inputMode="numeric"
          placeholder="To"
          value={filters.yearTo}
          onChange={(e) => filters.setYearTo(e.target.value)}
          className="w-20 rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs text-neutral-100 focus:border-red-600 focus:outline-none"
        />
        {(filters.yearFrom || filters.yearTo) && (
          <button
            type="button"
            onClick={filters.clearYear}
            className="text-neutral-500 hover:text-white"
            aria-label="Clear year range"
          >
            ×
          </button>
        )}
      </label>

      {children}
    </div>
  );
}
