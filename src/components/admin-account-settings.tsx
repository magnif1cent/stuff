"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";

const inputClasses =
  "rounded-md border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-100 focus:border-red-600 focus:outline-none";

export function AdminAccountSettings({
  currentEmail,
  hasPassword,
}: {
  currentEmail: string;
  hasPassword: boolean;
}) {
  return (
    <div className="flex flex-col gap-8">
      <EmailForm currentEmail={currentEmail} requirePassword={hasPassword} />
      <PasswordForm requireCurrent={hasPassword} />
      <SignOutEverywhere />
    </div>
  );
}

function SignOutEverywhere() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/account/sign-out-everywhere", { method: "POST" });
    if (!res.ok) {
      setLoading(false);
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong.");
      return;
    }
    signOut({ callbackUrl: "/login" });
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="mb-1 text-sm font-semibold text-white">Sessions</h2>
        <p className="text-xs text-neutral-500">
          Sign out of every device signed into your account, including this one — use this if you suspect
          someone else has access.
        </p>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button
        onClick={handleClick}
        disabled={loading}
        className="self-start rounded-md border border-neutral-700 bg-neutral-900 px-4 py-1.5 text-sm font-medium text-neutral-100 hover:bg-neutral-800 disabled:opacity-50"
      >
        {loading ? "Signing out…" : "Sign out everywhere"}
      </button>
    </div>
  );
}

function EmailForm({ currentEmail, requirePassword }: { currentEmail: string; requirePassword: boolean }) {
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch("/api/admin/account/email", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newEmail, currentPassword }),
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
    return <p className="text-sm text-neutral-300">Email updated &mdash; signing you out&hellip;</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div>
        <h2 className="mb-1 text-sm font-semibold text-white">Email</h2>
        <p className="text-xs text-neutral-500">Currently {currentEmail}</p>
      </div>
      <input
        type="email"
        required
        autoComplete="email"
        placeholder="New email"
        value={newEmail}
        onChange={(e) => setNewEmail(e.target.value)}
        className={inputClasses}
      />
      {requirePassword && (
        <input
          type="password"
          required
          autoComplete="current-password"
          placeholder="Current password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className={inputClasses}
        />
      )}
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={saving || !newEmail.trim()}
        className="self-start rounded-md bg-red-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
      >
        {saving ? "Saving…" : "Update email"}
      </button>
    </form>
  );
}

function PasswordForm({ requireCurrent }: { requireCurrent: boolean }) {
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
    const res = await fetch("/api/admin/account/password", {
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-white">{requireCurrent ? "Password" : "Set a password"}</h2>
      {requireCurrent && (
        <input
          type="password"
          required
          autoComplete="current-password"
          placeholder="Current password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className={inputClasses}
        />
      )}
      <input
        type="password"
        required
        autoComplete="new-password"
        placeholder="New password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        className={inputClasses}
      />
      <input
        type="password"
        required
        autoComplete="new-password"
        placeholder="Confirm new password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        className={inputClasses}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={saving || !newPassword}
        className="self-start rounded-md bg-red-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
      >
        {saving ? "Saving…" : requireCurrent ? "Update password" : "Set password"}
      </button>
    </form>
  );
}
