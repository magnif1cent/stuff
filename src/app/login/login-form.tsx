"use client";

import { useActionState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { authenticate } from "./actions";

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [error, formAction, pending] = useActionState(authenticate, undefined);

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-16">
      <h1 className="mb-6 text-2xl font-bold text-white">Sign in</h1>

      <button
        onClick={() => signIn("google", { callbackUrl })}
        className="mb-4 flex items-center justify-center rounded-md border border-neutral-700 bg-neutral-900 py-2 text-sm font-medium text-neutral-100 hover:bg-neutral-800"
      >
        Continue with Google
      </button>

      <div className="my-4 flex items-center gap-3 text-xs text-neutral-500">
        <div className="h-px flex-1 bg-neutral-800" />
        or
        <div className="h-px flex-1 bg-neutral-800" />
      </div>

      {/* A real <form action={serverAction}> submission, not a fetch()
          intercepted with preventDefault — browsers only reliably offer to
          save credentials for a genuine form POST that completes with a
          navigation, and this also collapses sign-in into a single
          browser-orchestrated request instead of a fetch followed by a
          separate client-triggered navigation. */}
      <form action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="Email"
          className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
        />
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          placeholder="Password"
          className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
        />
        <Link href="/forgot-password" className="-mt-1 self-end text-xs text-neutral-400 hover:text-red-500 hover:underline">
          Forgot password?
        </Link>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-red-700 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-neutral-400">
        No account?{" "}
        <Link href="/register" className="text-red-500 hover:underline">
          Register
        </Link>
      </p>
    </div>
  );
}
