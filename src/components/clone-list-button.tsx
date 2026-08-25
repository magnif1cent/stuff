"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CloneListButton({ listId, canClone }: { listId: string; canClone: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function clone() {
    if (!canClone) {
      router.push("/login");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/lists/${listId}/clone`, { method: "POST" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBusy(false);
      setError(body.error ?? "Couldn't clone this list.");
      return;
    }
    router.push(`/lists/${body.list.id}`);
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={clone}
        disabled={busy}
        className="w-fit rounded-md border border-neutral-700 px-3 py-1.5 text-sm font-medium text-neutral-200 transition hover:bg-neutral-800 disabled:opacity-50"
      >
        {busy ? "Cloning…" : "⎘ Clone this list"}
      </button>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
