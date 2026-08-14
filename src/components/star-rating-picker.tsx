"use client";

import { useState } from "react";
import { StarIcon } from "@/components/star-icon";

// Half-star clicks over 5 star icons set an exact 1-10 score — same
// half-star mechanic as RatingStarInput's search-filter picker, but this
// calls onSelect immediately with the chosen score rather than tracking a
// "minimum X and up" filter value.
export function StarRatingPicker({
  value,
  onSelect,
  disabled,
  fillColorClassName,
}: {
  value: number | null;
  onSelect: (score: number) => void;
  disabled?: boolean;
  fillColorClassName?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const display = hover ?? value ?? 0;

  return (
    <div className={`flex ${disabled ? "opacity-50" : ""}`} onMouseLeave={() => setHover(null)}>
      {[1, 2, 3, 4, 5].map((i) => {
        const low = i * 2 - 1;
        const high = i * 2;
        const fillPct = display >= high ? 100 : display >= low ? 50 : 0;
        return (
          <span key={i} className="relative">
            <StarIcon fillPct={fillPct} className="h-5 w-5" fillColorClassName={fillColorClassName} />
            <button
              type="button"
              disabled={disabled}
              aria-label={`${low}`}
              onClick={() => onSelect(low)}
              onMouseEnter={() => setHover(low)}
              className="absolute inset-y-0 left-0 w-1/2"
            />
            <button
              type="button"
              disabled={disabled}
              aria-label={`${high}`}
              onClick={() => onSelect(high)}
              onMouseEnter={() => setHover(high)}
              className="absolute inset-y-0 right-0 w-1/2"
            />
          </span>
        );
      })}
    </div>
  );
}
