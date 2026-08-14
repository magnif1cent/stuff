import * as Sentry from "@sentry/nextjs";

// Server/edge error reporting — only active when SENTRY_DSN is set, so local
// dev and CI (neither of which has a Sentry account) are unaffected. This
// mirrors the fail-open pattern every other optional integration in this app
// uses (Resend, Vercel Blob, Upstash, Turnstile).
export function register() {
  if (!process.env.SENTRY_DSN) return;
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    // Error reporting only, no performance tracing — this app has no
    // current need for request-latency breakdowns, and tracing adds
    // ongoing overhead/event volume for a benefit nobody's asked for yet.
    tracesSampleRate: 0,
  });
}

// Reports uncaught errors from Server Components, Route Handlers, and
// Server Actions. Left undefined (rather than always assigning
// Sentry.captureRequestError) when SENTRY_DSN is unset, since Next only
// calls this hook if it's a function — an explicit no-op is one less thing
// to reason about than relying on the SDK safely swallowing calls made
// before Sentry.init().
export const onRequestError = process.env.SENTRY_DSN ? Sentry.captureRequestError : undefined;
