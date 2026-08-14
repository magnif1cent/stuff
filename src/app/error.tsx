"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";

export default function ErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      Sentry.captureException(error);
    }
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-20 text-center">
      <h1 className="font-serif text-2xl font-bold text-white">Something went wrong</h1>
      <p className="max-w-md text-sm text-neutral-400">
        An unexpected error occurred. Try again, or head back to the homepage.
      </p>
      <div className="flex gap-3">
        <button
          onClick={() => unstable_retry()}
          className="rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-md border border-neutral-700 px-4 py-2 text-sm text-neutral-100 hover:bg-neutral-800"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
