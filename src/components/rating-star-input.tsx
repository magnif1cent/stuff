"use client";

import { useState } from "react";
import { StarIcon } from "@/components/star-icon";

// 5 stars represent the 1-10 scale via half-star clicks: star N's left
// half = (N*2 - 1), right half = N*2.

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
              <StarIcon fillPct={fillPct} />
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
