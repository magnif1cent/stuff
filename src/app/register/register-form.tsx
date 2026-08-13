"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Turnstile } from "@/components/turnstile";

export function RegisterForm({ nonce }: { nonce: string | null }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaResetKey, setCaptchaResetKey] = useState(0);

  const captchaRequired = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

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

    const result = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (result?.error) {
      setError("Account created, but sign-in failed. Try signing in.");
      return;
    }
    router.push("/");
    router.refresh();
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
          placeholder="Username"
          pattern="[a-z0-9_]{3,20}"
          title="3-20 characters: lowercase letters, numbers, and underscores"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
        />
        <p className="-mt-2 text-xs text-neutral-500">
          Shown publicly on your posts and ratings. 3-20 characters: lowercase letters, numbers, underscores.
        </p>
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
        />
        <input
          type="password"
          required
          placeholder="Password (min 12 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
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
