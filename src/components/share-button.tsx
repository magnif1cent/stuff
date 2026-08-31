"use client";

import { useState } from "react";

export function ShareButton({
  path,
  title,
  variant = "button",
  youtubeUrl,
}: {
  path: string;
  title: string;
  variant?: "button" | "icon";
  // When provided, adds a second copy option for the underlying YouTube
  // link (already carrying the clip's start time via youtubeWatchUrl) —
  // for sharing the source video directly instead of this site's permalink.
  youtubeUrl?: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [youtubeCopied, setYoutubeCopied] = useState(false);

  function absoluteUrl() {
    return `${window.location.origin}${path}`;
  }

  async function handleClick() {
    const url = absoluteUrl();
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // Ignored: user cancelled the OS share sheet.
      }
      return;
    }
    setMenuOpen((open) => !open);
  }

  async function copyLink() {
    await navigator.clipboard.writeText(absoluteUrl());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function copyYoutubeLink() {
    if (!youtubeUrl) return;
    await navigator.clipboard.writeText(youtubeUrl);
    setYoutubeCopied(true);
    setTimeout(() => setYoutubeCopied(false), 1500);
  }

  function shareIntent(platform: "x" | "facebook" | "reddit") {
    const url = absoluteUrl();
    const encodedUrl = encodeURIComponent(url);
    const encodedTitle = encodeURIComponent(title);
    const intents = {
      x: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      reddit: `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`,
    };
    window.open(intents[platform], "_blank", "noopener,noreferrer,width=600,height=500");
    setMenuOpen(false);
  }

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        title="Share"
        className={
          variant === "icon"
            ? "flex h-10 w-10 items-center justify-center rounded-md border border-neutral-700 text-neutral-400 hover:border-neutral-500 hover:text-white"
            : "flex items-center gap-1.5 rounded-md bg-red-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-600"
        }
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          <path d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7M16 6l-4-4-4 4M12 2v14" />
        </svg>
        {variant === "button" && "Share"}
      </button>

      {menuOpen && (
        <div className="absolute right-0 top-full z-10 mt-1.5 min-w-44 rounded-md border border-neutral-700 bg-neutral-800 p-1 shadow-xl">
          <button
            onClick={copyLink}
            className="w-full rounded px-3 py-1.5 text-left text-sm text-neutral-100 hover:bg-neutral-700"
          >
            {copied ? "Copied!" : "Copy link"}
          </button>
          {youtubeUrl && (
            <button
              onClick={copyYoutubeLink}
              className="w-full rounded px-3 py-1.5 text-left text-sm text-neutral-100 hover:bg-neutral-700"
            >
              {youtubeCopied ? "Copied!" : "Copy YouTube link"}
            </button>
          )}
          <div className="my-1 h-px bg-neutral-700" />
          <button
            onClick={() => shareIntent("x")}
            className="w-full rounded px-3 py-1.5 text-left text-sm text-neutral-100 hover:bg-neutral-700"
          >
            Share to X
          </button>
          <button
            onClick={() => shareIntent("facebook")}
            className="w-full rounded px-3 py-1.5 text-left text-sm text-neutral-100 hover:bg-neutral-700"
          >
            Share to Facebook
          </button>
          <button
            onClick={() => shareIntent("reddit")}
            className="w-full rounded px-3 py-1.5 text-left text-sm text-neutral-100 hover:bg-neutral-700"
          >
            Share to Reddit
          </button>
        </div>
      )}
    </div>
  );
}
