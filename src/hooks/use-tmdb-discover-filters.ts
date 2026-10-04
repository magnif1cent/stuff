"use client";

import { useState } from "react";

// Shared Country + release-year-range filter state for the admin "By keyword"
// and "By actor" import tabs — both build the same query-string suffix on top
// of their own search-specific params (keyword ids / a person id).
export function useTmdbDiscoverFilters() {
  const [country, setCountry] = useState("");
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");

  function toQueryString() {
    const params = new URLSearchParams();
    if (country) params.set("country", country);
    if (yearFrom) params.set("yearFrom", yearFrom);
    if (yearTo) params.set("yearTo", yearTo);
    const query = params.toString();
    return query ? `&${query}` : "";
  }

  function clearYear() {
    setYearFrom("");
    setYearTo("");
  }

  return { country, setCountry, yearFrom, setYearFrom, yearTo, setYearTo, clearYear, toQueryString };
}
