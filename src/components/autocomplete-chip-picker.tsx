"use client";

import { useEffect, useRef, useState } from "react";

const MAX_SUGGESTIONS = 8;

// Multi-select variant of AutocompleteFilterInput's search-to-narrow pattern,
// for a closed vocabulary that's already fully loaded (unlike actor/director,
// there's no need to hit the network per keystroke — Style/Move lists are
// admin-curated and small enough to filter client-side). Typing narrows the
// dropdown to unselected options; picking one adds a removable colored chip
// and clears the input for the next pick.
export function AutocompleteChipPicker({
  id,
  options,
  selected,
  onToggle,
  placeholder,
  pillClassName,
}: {
  id: string;
  options: { id: string; name: string }[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  placeholder: string;
  pillClassName: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const trimmed = query.trim().toLowerCase();
  const suggestions = trimmed
    ? options.filter((o) => !selected.has(o.id) && o.name.toLowerCase().includes(trimmed)).slice(0, MAX_SUGGESTIONS)
    : [];

  function pick(optionId: string) {
    onToggle(optionId);
    setQuery("");
    setHighlighted(-1);
    setOpen(false);
  }

  const selectedOptions = options.filter((o) => selected.has(o.id));
  const listboxId = `${id}-suggestions`;

  return (
    <div ref={containerRef} className="relative">
      <input
        id={id}
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setHighlighted(-1);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (suggestions.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlighted((h) => (h + 1) % suggestions.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlighted((h) => (h - 1 + suggestions.length) % suggestions.length);
          } else if (e.key === "Escape") {
            setOpen(false);
          } else if (e.key === "Enter" && highlighted >= 0) {
            e.preventDefault();
            pick(suggestions[highlighted].id);
          }
        }}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open && suggestions.length > 0}
        aria-controls={listboxId}
        className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
      />
      {open && suggestions.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute left-0 top-full z-30 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-neutral-800 bg-neutral-900 shadow-xl"
        >
          {suggestions.map((option, i) => (
            <li key={option.id} role="option" aria-selected={highlighted === i}>
              <button
                type="button"
                onClick={() => pick(option.id)}
                onMouseEnter={() => setHighlighted(i)}
                className={`block w-full truncate px-3 py-1.5 text-left text-sm text-neutral-100 ${
                  highlighted === i ? "bg-neutral-800" : ""
                }`}
              >
                {option.name}
              </button>
            </li>
          ))}
        </ul>
      )}
      {selectedOptions.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {selectedOptions.map((option) => (
            <span key={option.id} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${pillClassName}`}>
              {option.name}
              <button
                type="button"
                onClick={() => onToggle(option.id)}
                aria-label={`Remove ${option.name}`}
                className="opacity-70 hover:opacity-100"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
