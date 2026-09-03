"use client";

import { useState } from "react";
import Image from "next/image";
import { tmdbImageUrl } from "@/lib/tmdb";
import { AdminLineageFigurePicker, type LineageFigureRef } from "@/components/admin-lineage-figure-picker";
import { MAX_LINEAGE_NOTE_LENGTH } from "@/lib/lineage-constants";

interface LineageRelationRow {
  id: string;
  isPrimary: boolean;
  note: string | null;
  sifu: LineageFigureRef;
  student: LineageFigureRef;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}

function Avatar({ figure }: { figure: LineageFigureRef }) {
  return (
    <span className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-800 text-[10px] font-semibold text-neutral-400">
      {figure.profilePath ? (
        <Image
          src={tmdbImageUrl(figure.profilePath, "w200") ?? ""}
          alt=""
          fill
          unoptimized
          sizes="32px"
          className="object-cover"
        />
      ) : (
        initials(figure.name)
      )}
    </span>
  );
}

export function AdminLineageLinkForm({ initialRelations }: { initialRelations: LineageRelationRow[] }) {
  const [relations, setRelations] = useState(initialRelations);
  const [sifu, setSifu] = useState<LineageFigureRef | null>(null);
  const [student, setStudent] = useState<LineageFigureRef | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!sifu || !student) return;
    setSaving(true);
    setError(null);
    const res = await fetch("/api/admin/lineage/relations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sifuId: sifu.id, studentId: student.id, note: note.trim() || undefined }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong.");
      return;
    }
    const { relation } = await res.json();
    setRelations((prev) => [relation, ...prev]);
    setSifu(null);
    setStudent(null);
    setNote("");
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Remove this link?")) return;
    setError(null);
    const res = await fetch(`/api/admin/lineage/relations/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong.");
      return;
    }
    setRelations((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <div>
      <form onSubmit={handleSave} className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-[11px] font-semibold tracking-wide text-neutral-500 uppercase">
            Later
          </label>
          <AdminLineageFigurePicker
            key={student?.id ?? "student-empty"}
            value={student}
            onChange={setStudent}
            exclude={sifu}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] font-semibold tracking-wide text-neutral-500 uppercase">
            Earlier
          </label>
          <AdminLineageFigurePicker
            key={sifu?.id ?? "sifu-empty"}
            value={sifu}
            onChange={setSifu}
            exclude={student}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] font-semibold tracking-wide text-neutral-500 uppercase">
            Note (optional)
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={MAX_LINEAGE_NOTE_LENGTH}
            placeholder='e.g. "Wing Chun", "adopted disciple"'
            className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
          />
        </div>
      </form>

      <div className="mt-4 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving || !sifu || !student}
          className="rounded-md bg-red-700 px-5 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
        >
          Save link
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

      <div className="mt-6 border-t border-neutral-800 pt-4">
        <p className="mb-3 text-[11px] font-semibold tracking-wide text-neutral-500 uppercase">
          Existing links ({relations.length})
        </p>
        {relations.length === 0 ? (
          <p className="text-sm text-neutral-500">No links yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {relations.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <div className="flex items-center gap-2">
                    <Avatar figure={r.sifu} />
                    <span className="text-sm text-neutral-100">{r.sifu.name}</span>
                  </div>
                  <span className="shrink-0 text-neutral-600">&rarr;</span>
                  <div className="flex items-center gap-2">
                    <Avatar figure={r.student} />
                    <span className="text-sm text-neutral-100">{r.student.name}</span>
                  </div>
                  {!r.isPrimary && (
                    <span className="shrink-0 rounded-full border border-dashed border-neutral-700 px-2 py-0.5 text-[10px] text-neutral-500 uppercase">
                      secondary
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {r.note && (
                    <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-[11px] text-neutral-300">
                      {r.note}
                    </span>
                  )}
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="text-xs text-neutral-500 hover:text-red-400"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
