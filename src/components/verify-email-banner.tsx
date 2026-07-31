"use client";

import { useState } from "react";

export function VerifyEmailBanner() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function resend() {
    setStatus("sending");
    const res = await fetch("/api/resend-verification", { method: "POST" });
    setStatus(res.ok ? "sent" : "error");
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 border-b border-amber-800/50 bg-amber-950/40 px-4 py-2 text-sm text-amber-200">
      <span>Verify your email to rate movies, manage lists, and join discussions.</span>
      {status === "sent" ? (
        <span className="text-amber-400">Sent — check your inbox.</span>
      ) : (
        <button
          onClick={resend}
          disabled={status === "sending"}
          className="underline hover:text-white disabled:opacity-50"
        >
          {status === "sending" ? "Sending…" : "Resend email"}
        </button>
      )}
      {status === "error" && <span className="text-red-400">Something went wrong.</span>}
    </div>
  );
}
