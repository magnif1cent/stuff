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
  size = "sm",
}: {
  value: number | null;
  onSelect: (score: number) => void;
  disabled?: boolean;
  fillColorClassName?: string;
  // "sm" (default) matches the subcategory rows; "lg" is for a card's
  // primary overall-score picker, where the star should read as the main
  // control rather than a secondary refinement.
  size?: "sm" | "lg";
}) {
  const [hover, setHover] = useState<number | null>(null);
  const display = hover ?? value ?? 0;
  const iconClassName = size === "lg" ? "h-8 w-8 sm:h-6 sm:w-6" : "h-7 w-7 sm:h-5 sm:w-5";
  // The tap zone is taller than the star itself on mobile, so a half-star
  // selection doesn't need pixel-precise aim -- width still tracks the icon
  // exactly so neighboring stars stay edge-to-edge with no dead gap between
  // their half-star buttons. Exactly matches the icon at the sm breakpoint
  // and up, so desktop (mouse-precision) sizing is unchanged from before.
  const cellClassName = size === "lg" ? "h-11 w-8 sm:h-6 sm:w-6" : "h-11 w-7 sm:h-5 sm:w-5";

  return (
    <div className={`flex ${disabled ? "opacity-50" : ""}`} onMouseLeave={() => setHover(null)}>
      {[1, 2, 3, 4, 5].map((i) => {
        const low = i * 2 - 1;
        const high = i * 2;
        const fillPct = display >= high ? 100 : display >= low ? 50 : 0;
        return (
          <span key={i} className={`relative flex items-center justify-center ${cellClassName}`}>
            <StarIcon fillPct={fillPct} className={iconClassName} fillColorClassName={fillColorClassName} />
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
