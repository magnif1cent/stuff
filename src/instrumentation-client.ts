import * as Sentry from "@sentry/nextjs";

// Client-side (browser) error reporting — the one gap server-side logging
// (console.error, captured by Vercel's function logs) never covers: a React
// render crash or an uncaught client exception was previously invisible to
// anyone but the person who happened to have their browser console open.
// Only active when NEXT_PUBLIC_SENTRY_DSN is set; unset means Sentry.init()
// is never called and everything below no-ops, so local dev/CI need nothing.
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0,
  });
}

export const onRouterTransitionStart = process.env.NEXT_PUBLIC_SENTRY_DSN
  ? Sentry.captureRouterTransitionStart
  : undefined;
