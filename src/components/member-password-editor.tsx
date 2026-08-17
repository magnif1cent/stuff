"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";

const inputClasses =
  "w-full max-w-xs rounded-md border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-100 focus:border-red-600 focus:outline-none";
const labelClasses = "mb-1 block text-xs font-medium text-neutral-400";

export function MemberPasswordEditor({ hasPassword }: { hasPassword: boolean }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("New passwords don't match.");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch("/api/profile/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    if (!res.ok) {
      setSaving(false);
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong.");
      return;
    }
    setDone(true);
    signOut({ callbackUrl: "/login" });
  }

  if (done) {
    return <p className="text-sm text-neutral-300">Password updated &mdash; signing you out&hellip;</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-white">{hasPassword ? "Change password" : "Set a password"}</h2>
      {hasPassword && (
        <div>
          <label htmlFor="current-password" className={labelClasses}>
            Current password
          </label>
          <input
            id="current-password"
            type="password"
            required
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={inputClasses}
          />
        </div>
      )}
      <div>
        <label htmlFor="new-password" className={labelClasses}>
          New password
        </label>
        <input
          id="new-password"
          type="password"
          required
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className={inputClasses}
        />
      </div>
      <div>
        <label htmlFor="confirm-password" className={labelClasses}>
          Confirm new password
        </label>
        <input
          id="confirm-password"
          type="password"
          required
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className={inputClasses}
        />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={saving || !newPassword}
        className="self-start rounded-md bg-red-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
      >
        {saving ? "Saving…" : hasPassword ? "Update password" : "Set password"}
      </button>
    </form>
  );
}
