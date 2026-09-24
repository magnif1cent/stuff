"use client";

import { useState } from "react";
import Image from "next/image";
import { tmdbImageUrl, type TmdbCompanySearchResult } from "@/lib/tmdb";
import { useTmdbDiscoverImport, type TmdbDiscoverPage } from "@/hooks/use-tmdb-discover-import";
import { useTmdbDiscoverFilters } from "@/hooks/use-tmdb-discover-filters";
import { TmdbDiscoverResults } from "@/components/tmdb-discover-results";
import { TmdbDiscoverFilterFields } from "@/components/tmdb-discover-filter-fields";

export function AdminStudioImport() {
  const [companyQuery, setCompanyQuery] = useState("");
  const [companyOptions, setCompanyOptions] = useState<TmdbCompanySearchResult[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<TmdbCompanySearchResult | null>(null);
  const [searchingCompanies, setSearchingCompanies] = useState(false);
  const filters = useTmdbDiscoverFilters();

  const discover = useTmdbDiscoverImport(async (targetPage) => {
    if (!selectedCompany) return { ok: false, error: "Find and select a studio first." };
    const res = await fetch(
      `/api/admin/tmdb/discover?companyId=${selectedCompany.id}&page=${targetPage}${filters.toQueryString()}`,
    );
    const body = await res.json();
    if (!res.ok) return { ok: false, error: body.error ?? "Search failed." };
    return { ok: true, data: body as TmdbDiscoverPage };
  });

  async function handleCompanySearch(e: React.FormEvent) {
    e.preventDefault();
    if (!companyQuery.trim()) return;
    setSearchingCompanies(true);
    const res = await fetch(`/api/admin/tmdb/companies/search?q=${encodeURIComponent(companyQuery)}`);
    const body = await res.json();
    setSearchingCompanies(false);
    if (res.ok) setCompanyOptions(body.companies);
  }

  function selectCompany(company: TmdbCompanySearchResult) {
    setSelectedCompany(company);
    setCompanyOptions([]);
    setCompanyQuery("");
  }

  return (
    <div>
      <form onSubmit={handleCompanySearch} className="mb-2 flex gap-2">
        <input
          type="text"
          value={companyQuery}
          onChange={(e) => setCompanyQuery(e.target.value)}
          placeholder="Find a studio (e.g. Golden Harvest)"
          className="w-full max-w-md rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
        />
        <button
          type="submit"
          disabled={searchingCompanies}
          className="rounded-md border border-neutral-700 px-4 py-2 text-sm text-neutral-100 hover:bg-neutral-800 disabled:opacity-50"
        >
          {searchingCompanies ? "Searching…" : "Find studio"}
        </button>
      </form>

      {companyOptions.length > 0 && (
        <ul className="mb-4 flex flex-wrap gap-2">
          {companyOptions.map((company) => {
            const logoUrl = tmdbImageUrl(company.logo_path, "w200");
            return (
              <li key={company.id}>
                <button
                  onClick={() => selectCompany(company)}
                  className="flex items-center gap-2 rounded-full border border-neutral-700 py-1 pr-3 pl-1 text-xs text-neutral-300 hover:bg-neutral-800"
                >
                  <span className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full bg-neutral-800">
                    {logoUrl && (
                      <Image src={logoUrl} alt="" fill unoptimized sizes="24px" className="object-contain" />
                    )}
                  </span>
                  {company.name}
                  {company.origin_country && <span className="text-neutral-500">· {company.origin_country}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {selectedCompany && (
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="text-xs text-neutral-500">Produced by:</span>
          <span className="flex items-center gap-1 rounded-full bg-red-700/20 px-3 py-1 text-xs text-red-400">
            {selectedCompany.name}
            <button
              onClick={() => setSelectedCompany(null)}
              className="text-red-400 hover:text-white"
              aria-label={`Remove ${selectedCompany.name}`}
            >
              ×
            </button>
          </span>
        </div>
      )}

      <TmdbDiscoverFilterFields filters={filters}>
        <button
          onClick={discover.search}
          disabled={discover.loading || !selectedCompany}
          className="rounded-md bg-red-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
        >
          {discover.loading ? "Searching…" : "Search movies"}
        </button>
      </TmdbDiscoverFilterFields>

      {discover.message && <p className="mb-4 text-sm text-neutral-300">{discover.message}</p>}

      <TmdbDiscoverResults discover={discover} />
    </div>
  );
}
