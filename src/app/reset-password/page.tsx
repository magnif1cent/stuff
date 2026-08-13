"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    setLoading(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong.");
      return;
    }

    setDone(true);
  }

  if (!token) {
    return (
      <Message title="Invalid link">
        This password reset link is missing its token. Check that you copied the full URL from your email.
      </Message>
    );
  }

  if (done) {
    return (
      <Message title="Password updated">
        Your password has been changed. You can now sign in with your new password.
      </Message>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-16">
      <h1 className="mb-6 text-2xl font-bold text-white">Set a new password</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="password"
          required
          placeholder="New password (min 12 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
        />
        <input
          type="password"
          required
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-red-700 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
        >
          {loading ? "Saving…" : "Set new password"}
        </button>
      </form>
    </div>
  );
}

function Message({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="mb-3 text-2xl font-bold text-white">{title}</h1>
      <p className="mb-6 text-neutral-400">{children}</p>
      <Link href="/login" className="text-red-500 hover:underline">
        Go to sign in
      </Link>
    </div>
  );
}
