"use client";

import { useState } from "react";
import { Turnstile } from "@/components/turnstile";

// Sends a fresh verification link via the unauthenticated
// /api/resend-verification-public — the only way an unverified member can
// get a new one now that sign-in itself is blocked until they verify (they
// can no longer reach the authenticated /api/resend-verification the
// account banner normally uses). Used both under the login form (email
// already known from a failed sign-in attempt) and on the "link expired"
// state of /verify-email (email known from the expired token, still editable
// in case it's wrong).
export function ResendVerificationForm({
  email: initialEmail,
  nonce,
}: {
  email?: string;
  nonce: string | null;
}) {
  const [email, setEmail] = useState(initialEmail ?? "");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaResetKey, setCaptchaResetKey] = useState(0);

  const captchaRequired = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  async function handleResend() {
    setStatus("loading");

    const res = await fetch("/api/resend-verification-public", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, captchaToken }),
    });

    if (!res.ok) {
      setStatus("error");
      setCaptchaToken(null);
      setCaptchaResetKey((k) => k + 1);
      return;
    }

    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <p className="text-sm text-neutral-400">
        If that account needs verifying, we&rsquo;ve sent a new link to {email}.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-neutral-800 bg-neutral-900/50 p-3">
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
      <button
        type="button"
        onClick={handleResend}
        disabled={status === "loading" || !email || (captchaRequired && !captchaToken)}
        className="self-start text-sm text-red-500 hover:underline disabled:opacity-50"
      >
        {status === "loading" ? "Sending…" : "Resend verification email"}
      </button>
      {status === "error" && <p className="text-sm text-red-500">Something went wrong. Try again.</p>}
    </div>
  );
}
