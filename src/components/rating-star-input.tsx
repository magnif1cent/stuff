"use client";

import { useState } from "react";

// 5 stars represent the 1-10 scale via half-star clicks: star N's left
// half = (N*2 - 1), right half = N*2. No icon library installed, so both
// the outline and filled stars are plain inline SVG (same star polygon,
// just fill vs. stroke).
const STAR_PATH =
  "M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.286-5.385a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z";

function Star({ fillPct }: { fillPct: number }) {
  return (
    <span className="relative block h-6 w-6">
      <svg viewBox="0 0 24 24" className="absolute inset-0 h-6 w-6 text-neutral-600">
        <path d={STAR_PATH} fill="none" stroke="currentColor" strokeWidth={1.5} />
      </svg>
      <span className="absolute inset-0 overflow-hidden" style={{ width: `${fillPct}%` }}>
        <svg viewBox="0 0 24 24" className="h-6 w-6 text-yellow-500">
          <path d={STAR_PATH} fill="currentColor" />
        </svg>
      </span>
    </span>
  );
}

export function RatingStarInput({ name, initialValue }: { name: string; initialValue: string }) {
  const parsed = initialValue ? Number(initialValue) : NaN;
  const [value, setValue] = useState<number | null>(
    Number.isFinite(parsed) && parsed >= 1 && parsed <= 10 ? parsed : null,
  );
  const [hover, setHover] = useState<number | null>(null);

  const display = hover ?? value ?? 0;

  function select(v: number) {
    setValue((current) => (current === v ? null : v));
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex" onMouseLeave={() => setHover(null)}>
        {[1, 2, 3, 4, 5].map((i) => {
          const low = i * 2 - 1;
          const high = i * 2;
          const fillPct = display >= high ? 100 : display >= low ? 50 : 0;
          return (
            <span key={i} className="relative">
              <Star fillPct={fillPct} />
              <button
                type="button"
                aria-label={`${low} and up`}
                onClick={() => select(low)}
                onMouseEnter={() => setHover(low)}
                className="absolute inset-y-0 left-0 w-1/2"
              />
              <button
                type="button"
                aria-label={`${high} and up`}
                onClick={() => select(high)}
                onMouseEnter={() => setHover(high)}
                className="absolute inset-y-0 right-0 w-1/2"
              />
            </span>
          );
        })}
      </div>
      <span className="text-sm text-neutral-400">{value === null ? "Any" : `${value}+`}</span>
      {value !== null && (
        <button
          type="button"
          onClick={() => setValue(null)}
          aria-label="Clear minimum rating"
          className="text-neutral-500 hover:text-neutral-300"
        >
          ×
        </button>
      )}
      <input type="hidden" name={name} value={value === null ? "" : value} />
    </div>
  );
}
