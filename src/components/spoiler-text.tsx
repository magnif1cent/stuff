"use client";

import { useState } from "react";

const SPOILER_PATTERN = /\[spoiler\]([\s\S]*?)\[\/spoiler\]/gi;

function splitSpoilers(content: string) {
  const parts: { text: string; spoiler: boolean }[] = [];
  let lastIndex = 0;
  const regex = new RegExp(SPOILER_PATTERN);
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ text: content.slice(lastIndex, match.index), spoiler: false });
    }
    parts.push({ text: match[1], spoiler: true });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) {
    parts.push({ text: content.slice(lastIndex), spoiler: false });
  }

  return parts;
}

function SpoilerSpan({ text }: { text: string }) {
  const [revealed, setRevealed] = useState(false);

  if (revealed) {
    return <span className="rounded bg-neutral-800 px-1 text-neutral-200">{text}</span>;
  }

  return (
    <button
      type="button"
      onClick={() => setRevealed(true)}
      title="Click to reveal spoiler"
      className="rounded bg-neutral-700 px-1 text-xs font-medium text-neutral-300 hover:bg-neutral-600"
    >
      Spoiler (click to reveal)
    </button>
  );
}

export function SpoilerText({ content, className }: { content: string; className?: string }) {
  const parts = splitSpoilers(content);

  return (
    <p className={className ?? "whitespace-pre-wrap text-sm text-neutral-200"}>
      {parts.map((part, index) =>
        part.spoiler ? (
          <SpoilerSpan key={index} text={part.text} />
        ) : (
          <span key={index}>{part.text}</span>
        ),
      )}
    </p>
  );
}
