"use client";

import { useState } from "react";

const STEP = 0.5;
const MIN = 1;
const MAX = 10;

function clamp(n: number) {
  return Math.min(MAX, Math.max(MIN, Math.round(n * 10) / 10));
}

export function RatingStepperInput({ name, initialValue }: { name: string; initialValue: string }) {
  const parsed = initialValue ? Number(initialValue) : NaN;
  const [value, setValue] = useState<number | null>(Number.isFinite(parsed) ? clamp(parsed) : null);

  function increment() {
    setValue((v) => clamp((v ?? MIN - STEP) + STEP));
  }

  function decrement() {
    setValue((v) => (v === null ? null : clamp(v - STEP)));
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={decrement}
        disabled={value !== null && value <= MIN}
        aria-label="Decrease minimum rating"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-neutral-700 text-neutral-100 hover:bg-neutral-800 disabled:opacity-40"
      >
        −
      </button>
      <div className="flex-1 text-center text-sm text-neutral-100">{value === null ? "Any" : `${value.toFixed(1)}+`}</div>
      <button
        type="button"
        onClick={increment}
        disabled={value !== null && value >= MAX}
        aria-label="Increase minimum rating"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-neutral-700 text-neutral-100 hover:bg-neutral-800 disabled:opacity-40"
      >
        +
      </button>
      {value !== null && (
        <button
          type="button"
          onClick={() => setValue(null)}
          aria-label="Clear minimum rating"
          className="shrink-0 text-neutral-500 hover:text-neutral-300"
        >
          ×
        </button>
      )}
      <input type="hidden" name={name} value={value === null ? "" : value} />
    </div>
  );
}
