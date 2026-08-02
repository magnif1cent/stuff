"use client";

import { useEffect, useRef, useState } from "react";

const DEBOUNCE_MS = 250;

// Plain autocomplete, not an instant-search dropdown — selecting a
// suggestion just fills the field so it submits with the rest of the
// filter form on "Apply", it doesn't navigate on its own.
export function DirectorFilterInput({ initialValue }: { initialValue: string }) {
  const [value, setValue] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const requestId = useRef(0);

  useEffect(() => {
    const trimmed = value.trim();
    // Nothing to fetch — rendering already hides the dropdown for an empty
    // value, so stale `suggestions` left over from a prior value is harmless.
    if (!trimmed) return;

    const id = ++requestId.current;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/directors?q=${encodeURIComponent(trimmed)}`);
        if (!res.ok || requestId.current !== id) return;
        const data = await res.json();
        setSuggestions(data.directors ?? []);
      } catch {
        if (requestId.current === id) setSuggestions([]);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [value]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function select(name: string) {
    setValue(name);
    setOpen(false);
    setHighlighted(-1);
  }

  const visibleSuggestions = value.trim() ? suggestions : [];

  return (
    <div ref={containerRef} className="relative">
      <input
        id="director"
        type="text"
        name="director"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setHighlighted(-1);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (visibleSuggestions.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlighted((h) => (h + 1) % visibleSuggestions.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlighted((h) => (h - 1 + visibleSuggestions.length) % visibleSuggestions.length);
          } else if (e.key === "Escape") {
            setOpen(false);
          } else if (e.key === "Enter" && highlighted >= 0) {
            e.preventDefault();
            select(visibleSuggestions[highlighted]);
          }
        }}
        placeholder="Any director"
        autoComplete="off"
        role="combobox"
        aria-expanded={open && visibleSuggestions.length > 0}
        aria-controls="director-suggestions"
        className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
      />
      {open && visibleSuggestions.length > 0 && (
        <ul
          id="director-suggestions"
          role="listbox"
          className="absolute left-0 top-full z-30 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-neutral-800 bg-neutral-900 shadow-xl"
        >
          {visibleSuggestions.map((name, i) => (
            <li key={name} role="option" aria-selected={highlighted === i}>
              <button
                type="button"
                onClick={() => select(name)}
                onMouseEnter={() => setHighlighted(i)}
                className={`block w-full truncate px-3 py-1.5 text-left text-sm text-neutral-100 ${
                  highlighted === i ? "bg-neutral-800" : ""
                }`}
              >
                {name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
