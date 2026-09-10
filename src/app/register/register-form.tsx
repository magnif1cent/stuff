"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";
import { Turnstile } from "@/components/turnstile";

export function RegisterForm({ nonce }: { nonce: string | null }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaResetKey, setCaptchaResetKey] = useState(0);
  const [registered, setRegistered] = useState(false);

  const captchaRequired = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password, captchaToken }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong.");
      setLoading(false);
      // A Turnstile token is single-use — get a fresh one before the next attempt.
      setCaptchaToken(null);
      setCaptchaResetKey((k) => k + 1);
      return;
    }

    // No auto sign-in here: registration only creates the account and sends
    // the verification email. Signing the member in immediately let anyone
    // start using the account before proving they own the email address —
    // completing verification is a separate, deliberate step now.
    setLoading(false);
    setRegistered(true);
  }

  if (registered) {
    return (
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <h1 className="mb-3 text-2xl font-bold text-white">Check your email</h1>
        <p className="mb-6 text-neutral-400">
          If {email} isn&rsquo;t already registered, we&rsquo;ve sent a verification link to it. Click it to
          verify your account, then sign in.
        </p>
        <Link href="/login" className="text-red-500 hover:underline">
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-16">
      <h1 className="mb-6 text-2xl font-bold text-white">Create your account</h1>

      <button
        onClick={() => signIn("google", { callbackUrl: "/" })}
        className="mb-4 flex items-center justify-center rounded-md border border-neutral-700 bg-neutral-900 py-2 text-sm font-medium text-neutral-100 hover:bg-neutral-800"
      >
        Continue with Google
      </button>

      <div className="my-4 flex items-center gap-3 text-xs text-neutral-500">
        <div className="h-px flex-1 bg-neutral-800" />
        or
        <div className="h-px flex-1 bg-neutral-800" />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="text"
          required
          autoComplete="username"
          placeholder="Username"
          pattern="[a-zA-Z0-9_]{3,20}"
          title="3-20 characters: letters, numbers, and underscores"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
        />
        <p className="-mt-2 text-xs text-neutral-500">
          Shown publicly on your posts and ratings. 3-20 characters: letters, numbers, underscores.
        </p>
        <input
          type="email"
          required
          autoComplete="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
        />
        <input
          type="password"
          required
          autoComplete="new-password"
          placeholder="Password (min 8 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
        />
        <input
          type="password"
          required
          autoComplete="new-password"
          placeholder="Confirm password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
        />
        <Turnstile key={captchaResetKey} nonce={nonce} onVerify={setCaptchaToken} />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={loading || (captchaRequired && !captchaToken)}
          className="rounded-md bg-red-700 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
        >
          {loading ? "Creating account…" : "Create account"}
        </button>
        <p className="text-center text-xs text-neutral-500">
          By creating an account, you agree to our{" "}
          <Link href="/terms" className="text-neutral-400 hover:text-white">Terms</Link> and{" "}
          <Link href="/privacy" className="text-neutral-400 hover:text-white">Privacy Policy</Link>.
        </p>
      </form>

      <p className="mt-6 text-center text-sm text-neutral-400">
        Already have an account?{" "}
        <Link href="/login" className="text-red-500 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
