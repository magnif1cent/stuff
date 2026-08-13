"use client";

import Link from "next/link";
import { useState } from "react";
import { Turnstile } from "@/components/turnstile";

export function ForgotPasswordForm({ nonce }: { nonce: string | null }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaResetKey, setCaptchaResetKey] = useState(0);

  const captchaRequired = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, captchaToken }),
    });

    setLoading(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong.");
      setCaptchaToken(null);
      setCaptchaResetKey((k) => k + 1);
      return;
    }

    // Always the same success state regardless of whether the email has an
    // account — the API deliberately returns the same response either way.
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <h1 className="mb-3 text-2xl font-bold text-white">Check your email</h1>
        <p className="mb-6 text-neutral-400">
          If an account exists for that email, we&rsquo;ve sent a link to reset your password. It expires in 1
          hour.
        </p>
        <Link href="/login" className="text-red-500 hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-16">
      <h1 className="mb-2 text-2xl font-bold text-white">Reset your password</h1>
      <p className="mb-6 text-sm text-neutral-400">
        Enter your account&rsquo;s email address and we&rsquo;ll send you a link to set a new password.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="email"
          required
          autoComplete="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
        />
        <Turnstile key={captchaResetKey} nonce={nonce} onVerify={setCaptchaToken} />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={loading || (captchaRequired && !captchaToken)}
          className="rounded-md bg-red-700 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
        >
          {loading ? "Sending…" : "Send reset link"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-neutral-400">
        Remembered it?{" "}
        <Link href="/login" className="text-red-500 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
