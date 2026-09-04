import { NextRequest, NextResponse } from "next/server";

// Nonce-based CSP, following Next.js's documented pattern (a static CSP
// can't allow Next's own injected scripts without 'unsafe-inline', which
// defeats the point of having one). 'unsafe-eval' is dev-only — Turbopack's
// dev server/React Refresh needs it, production builds don't.
//
// connect-src's Sentry entry assumes a US-region Sentry org (the default for
// a new account) — an EU-region org needs *.ingest.eu.sentry.io instead, or
// client-side error reports are silently CSP-blocked. Harmless to leave
// allowlisted if SENTRY_DSN is never set.
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";

  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${isDev ? "'unsafe-eval'" : ""} https:;
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: blob: https://image.tmdb.org https://*.public.blob.vercel-storage.com https://img.youtube.com;
    font-src 'self';
    connect-src 'self' https://challenges.cloudflare.com https://*.ingest.us.sentry.io;
    frame-src https://www.youtube-nocookie.com https://challenges.cloudflare.com;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `
    .replace(/\s{2,}/g, " ")
    .trim();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", cspHeader);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", cspHeader);
  return response;
}

export const config = {
  // Only page navigations need a CSP — API routes return JSON, not HTML
  // that executes script, and static assets/images don't execute anything
  // this header would govern either.
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
