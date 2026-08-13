"use client";

import Script from "next/script";
import { useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
        },
      ) => string;
    };
  }
}

// Renders nothing, and never blocks the form it's in, when
// NEXT_PUBLIC_TURNSTILE_SITE_KEY isn't set — matches this app's fail-open
// pattern for every other optional external service. `nonce` must come from
// the page's own CSP nonce (read server-side via `headers()`, since this is
// a client component and can't read response headers itself) — the CSP's
// `'strict-dynamic'` only trusts scripts loaded by an already-nonce'd tag.
export function Turnstile({ nonce, onVerify }: { nonce: string | null; onVerify: (token: string | null) => void }) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const containerRef = useRef<HTMLDivElement>(null);
  const renderedRef = useRef(false);

  function renderWidget() {
    if (renderedRef.current || !siteKey || !containerRef.current || !window.turnstile) return;
    renderedRef.current = true;
    window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      callback: onVerify,
      "expired-callback": () => onVerify(null),
    });
  }

  if (!siteKey) return null;

  return (
    <>
      {/* onReady (not onLoad) since it also fires on remount when api.js is
          already cached from an earlier page — onLoad alone wouldn't. */}
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
        nonce={nonce ?? undefined}
        onReady={renderWidget}
      />
      <div ref={containerRef} />
    </>
  );
}
