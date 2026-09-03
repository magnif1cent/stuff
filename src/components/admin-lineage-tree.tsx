"use client";

import { useState } from "react";
import Image from "next/image";
import { tmdbImageUrl } from "@/lib/tmdb";
import { AdminLineagePersonPicker, type PersonRef } from "@/components/admin-lineage-person-picker";
import { MAX_LINEAGE_NOTE_LENGTH } from "@/lib/lineage-constants";

interface DescendantGroup {
  parent: PersonRef;
  children: PersonRef[];
  overflowCount: number;
}

interface LineageTree {
  center: PersonRef;
  ancestors: PersonRef[];
  ancestorsTruncated: boolean;
  secondarySifus: PersonRef[];
  descendantLevels: DescendantGroup[][];
  descendantsTruncated: boolean;
}

const DEFAULT_DEPTH = { up: 2, down: 2 };

function Avatar({ person, size = 40 }: { person: PersonRef; size?: number }) {
  return (
    <span
      className="relative shrink-0 overflow-hidden rounded-full bg-neutral-800"
      style={{ width: size, height: size }}
    >
      {person.profilePath && (
        <Image
          src={tmdbImageUrl(person.profilePath, "w200") ?? ""}
          alt=""
          fill
          unoptimized
          sizes={`${size}px`}
          className="object-cover"
        />
      )}
    </span>
  );
}

export function AdminLineageTree() {
  const [selected, setSelected] = useState<PersonRef | null>(null);
  const [tree, setTree] = useState<LineageTree | null>(null);
  const [depth, setDepth] = useState(DEFAULT_DEPTH);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addMode, setAddMode] = useState<"sifu" | "student" | null>(null);
  const [addPerson, setAddPerson] = useState<PersonRef | null>(null);
  const [addNote, setAddNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadTree(person: PersonRef, nextDepth: { up: number; down: number } = DEFAULT_DEPTH) {
    setSelected(person);
    setDepth(nextDepth);
    setLoading(true);
    setError(null);
    setAddMode(null);
    const res = await fetch(`/api/admin/lineage/tree?personId=${person.id}&up=${nextDepth.up}&down=${nextDepth.down}`);
    setLoading(false);
    if (!res.ok) {
      setTree(null);
      setError("Couldn't load that person's lineage.");
      return;
    }
    const data = await res.json();
    setTree(data.tree);
  }

  function expandUp() {
    if (selected) loadTree(selected, { up: depth.up + 2, down: depth.down });
  }
  function expandDown() {
    if (selected) loadTree(selected, { up: depth.up, down: depth.down + 2 });
  }

  async function confirmAdd() {
    if (!tree || !addMode || !addPerson) return;
    setSaving(true);
    setError(null);
    const body =
      addMode === "sifu"
        ? { sifuId: addPerson.id, studentId: tree.center.id, note: addNote.trim() || undefined }
        : { sifuId: tree.center.id, studentId: addPerson.id, note: addNote.trim() || undefined };
    const res = await fetch("/api/admin/lineage/relations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong.");
      return;
    }
    setAddMode(null);
    setAddPerson(null);
    setAddNote("");
    await loadTree(tree.center, depth);
  }

  return (
    <div>
      <div className="max-w-sm">
        <label className="mb-1.5 block text-[11px] font-semibold tracking-wide text-neutral-500 uppercase">
          Person
        </label>
        <AdminLineagePersonPicker
          key={selected?.id ?? "none"}
          value={selected}
          onChange={loadTree}
          placeholder="Search for an actor…"
        />
      </div>

      {loading && <p className="mt-6 text-sm text-neutral-500">Loading…</p>}
      {error && <p className="mt-4 text-sm text-red-500">{error}</p>}

      {tree && !loading && (
        <div className="mt-6 flex flex-col items-center gap-3">
          {tree.ancestorsTruncated && (
            <button onClick={expandUp} className="text-[11px] text-neutral-500 hover:text-neutral-300">
              &hellip; show earlier generations
            </button>
          )}

          {[...tree.ancestors].reverse().map((ancestor) => (
            <div key={ancestor.id} className="flex flex-col items-center gap-2">
              <button
                onClick={() => loadTree(ancestor)}
                className="flex flex-col items-center gap-1 rounded-md px-2 py-1 hover:bg-neutral-900"
              >
                <Avatar person={ancestor} />
                <span className="text-xs text-neutral-300">{ancestor.name}</span>
              </button>
              <span className="text-neutral-700">&darr;</span>
            </div>
          ))}

          {tree.secondarySifus.length > 0 && (
            <div className="flex items-center gap-2 text-[11px] text-neutral-500">
              Co-sifu:
              {tree.secondarySifus.map((s) => (
                <button
                  key={s.id}
                  onClick={() => loadTree(s)}
                  className="flex items-center gap-1.5 rounded-full border border-dashed border-neutral-700 px-2 py-1 hover:border-neutral-500"
                >
                  <Avatar person={s} size={20} />
                  <span className="text-neutral-300">{s.name}</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-col items-center gap-1 rounded-md border-2 border-red-600 bg-red-950/60 px-4 py-2">
            <Avatar person={tree.center} size={48} />
            <span className="text-sm font-semibold text-white">{tree.center.name}</span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                setAddMode("sifu");
                setAddPerson(null);
                setAddNote("");
              }}
              className="rounded-full bg-red-700 px-3 py-1 text-[11px] font-semibold text-white uppercase hover:bg-red-600"
            >
              + Sifu
            </button>
            <button
              onClick={() => {
                setAddMode("student");
                setAddPerson(null);
                setAddNote("");
              }}
              className="rounded-full bg-red-700 px-3 py-1 text-[11px] font-semibold text-white uppercase hover:bg-red-600"
            >
              + Student
            </button>
          </div>

          {addMode && (
            <div className="w-72 rounded-md border border-neutral-700 bg-neutral-900 p-3">
              <p className="mb-2 text-[11px] font-semibold text-neutral-300">
                Add {addMode === "sifu" ? "sifu of" : "student of"} {tree.center.name}
              </p>
              <AdminLineagePersonPicker
                key={addPerson?.id ?? "empty"}
                value={addPerson}
                onChange={setAddPerson}
                excludeId={tree.center.id}
              />
              <input
                type="text"
                value={addNote}
                onChange={(e) => setAddNote(e.target.value)}
                maxLength={MAX_LINEAGE_NOTE_LENGTH}
                placeholder="Note (optional)"
                className="mt-2 w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm text-neutral-100 focus:border-red-600 focus:outline-none"
              />
              <div className="mt-2 flex justify-between">
                <button
                  onClick={() => setAddMode(null)}
                  className="px-1 text-xs font-semibold text-neutral-500 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmAdd}
                  disabled={!addPerson || saving}
                  className="rounded-md bg-red-700 px-4 py-1.5 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Confirm"}
                </button>
              </div>
            </div>
          )}

          {tree.descendantLevels.map((groups, levelIndex) => (
            <div key={levelIndex} className="flex flex-col items-center gap-2">
              <span className="text-neutral-700">&darr;</span>
              <div className="flex flex-wrap justify-center gap-x-6 gap-y-3">
                {groups.map((group) => (
                  <div key={group.parent.id} className="flex gap-3">
                    {group.children.map((child) => (
                      <button
                        key={child.id}
                        onClick={() => loadTree(child)}
                        className="flex flex-col items-center gap-1 rounded-md px-2 py-1 hover:bg-neutral-900"
                      >
                        <Avatar person={child} />
                        <span className="max-w-20 truncate text-xs text-neutral-300">{child.name}</span>
                      </button>
                    ))}
                    {group.overflowCount > 0 && (
                      <div className="flex flex-col items-center gap-1 px-2 py-1">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-dashed border-neutral-700 text-xs text-neutral-500">
                          +{group.overflowCount}
                        </span>
                        <span className="text-xs text-neutral-500">more</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {tree.descendantsTruncated && (
            <button onClick={expandDown} className="text-[11px] text-neutral-500 hover:text-neutral-300">
              show more generations &hellip;
            </button>
          )}
        </div>
      )}
    </div>
  );
}
