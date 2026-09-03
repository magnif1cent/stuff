"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MAX_CHAIN_TEXT_LENGTH } from "@/lib/lineage-constants";

interface PersonRef {
  id: string;
  name: string;
  profilePath: string | null;
}

type NameMatch =
  | { status: "found"; person: PersonRef }
  | { status: "ambiguous"; candidates: PersonRef[] }
  | { status: "not_found" };

interface PreviewRow {
  sifuName: string;
  studentName: string;
  status: "new" | "exists" | "ambiguous" | "not_found" | "invalid";
  message?: string;
  sifu: NameMatch;
  student: NameMatch;
}

const EXAMPLE_TEXT = `Old Master Yuen > White Crane Elder > Iron Fist Chen
Iron Fist Chen > Silver Dragon Mei
Iron Fist Chen > Crimson Tiger Wu`;

function pickedId(match: NameMatch, pick: string | undefined): string | null {
  if (match.status === "found") return match.person.id;
  if (match.status === "ambiguous") return pick ?? match.candidates[0]?.id ?? null;
  return null;
}

// The candidate treated as selected for an ambiguous side: whatever the
// admin explicitly picked, defaulting to the first match (mirrors the
// pre-selected chip in the wireframe) until they choose otherwise.
function selectedCandidateId(candidates: PersonRef[], pick: string | undefined): string | undefined {
  return pick ?? candidates[0]?.id;
}

export function AdminLineageBulkImport() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [rows, setRows] = useState<PreviewRow[] | null>(null);
  const [picks, setPicks] = useState<Record<number, { sifu?: string; student?: string }>>({});
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null);

  async function handlePreview() {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    const res = await fetch("/api/admin/lineage/bulk/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong.");
      return;
    }
    const data = await res.json();
    setRows(data.rows);
    setPicks({});
  }

  const importableRows = useMemo(() => {
    if (!rows) return [];
    return rows
      .map((row, index) => {
        if (row.status !== "new" && row.status !== "ambiguous") return null;
        const sifuId = pickedId(row.sifu, picks[index]?.sifu);
        const studentId = pickedId(row.student, picks[index]?.student);
        if (!sifuId || !studentId) return null;
        return { sifuId, studentId };
      })
      .filter((r): r is { sifuId: string; studentId: string } => r !== null);
  }, [rows, picks]);

  const counts = useMemo(() => {
    if (!rows) return null;
    return {
      new: rows.filter((r) => r.status === "new").length,
      exists: rows.filter((r) => r.status === "exists").length,
      ambiguous: rows.filter((r) => r.status === "ambiguous").length,
      notFound: rows.filter((r) => r.status === "not_found" || r.status === "invalid").length,
    };
  }, [rows]);

  async function handleImport() {
    if (importableRows.length === 0) return;
    setImporting(true);
    setError(null);
    const res = await fetch("/api/admin/lineage/bulk/commit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows: importableRows }),
    });
    setImporting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong.");
      return;
    }
    const data = await res.json();
    setResult({ created: data.created, skipped: data.skipped });
    setRows(null);
    setText("");
    router.refresh();
  }

  return (
    <div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={MAX_CHAIN_TEXT_LENGTH}
        placeholder={EXAMPLE_TEXT}
        rows={6}
        className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 font-mono text-[12.5px] leading-relaxed text-neutral-100 focus:border-red-600 focus:outline-none"
      />
      <p className="mt-2 text-[11px] text-neutral-500">
        Separate names with <code className="rounded bg-neutral-800 px-1 py-0.5 text-neutral-300">&gt;</code>, one
        chain per line, sifu first. Names are matched against actors already in the catalog.
      </p>

      <div className="mt-3 flex justify-end">
        <button
          onClick={handlePreview}
          disabled={loading || !text.trim()}
          className="rounded-md bg-red-700 px-5 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
        >
          {loading ? "Previewing…" : "Preview matches"}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      {result && (
        <p className="mt-3 text-sm text-neutral-300">
          Imported {result.created} link{result.created === 1 ? "" : "s"}
          {result.skipped > 0 && ` (${result.skipped} skipped)`}.
        </p>
      )}

      {rows && counts && (
        <>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-md border border-neutral-700 bg-neutral-950 px-4 py-2.5">
            <p className="text-xs text-neutral-300">
              <b className="text-white">{rows.length}</b> links parsed &mdash; {counts.new} new, {counts.exists}{" "}
              already linked, {counts.ambiguous} need{counts.ambiguous === 1 ? "s" : ""} review, {counts.notFound}{" "}
              not found
            </p>
            <button
              onClick={handleImport}
              disabled={importing || importableRows.length === 0}
              className="rounded-md bg-red-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
            >
              {importing ? "Importing…" : `Import ${importableRows.length} link${importableRows.length === 1 ? "" : "s"}`}
            </button>
          </div>

          <div className="mt-3 flex flex-col gap-1.5">
            {rows.map((row, index) => (
              <div key={index}>
                <div
                  className={`flex items-center gap-3 rounded-md border px-3 py-2 text-sm ${
                    row.status === "exists"
                      ? "border-neutral-800 bg-neutral-950 opacity-50"
                      : row.status === "ambiguous"
                        ? "border-amber-900 bg-neutral-950"
                        : row.status === "not_found" || row.status === "invalid"
                          ? "border-red-950 bg-neutral-950"
                          : "border-neutral-800 bg-neutral-950"
                  }`}
                >
                  <span className="min-w-0 flex-1 truncate text-neutral-100">
                    {row.sifuName} <span className="text-neutral-600">&rarr;</span> {row.studentName}
                  </span>
                  {row.message && <span className="shrink-0 text-[11px] text-neutral-500">{row.message}</span>}
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                      row.status === "new"
                        ? "bg-neutral-800 text-neutral-300"
                        : row.status === "exists"
                          ? "border border-dashed border-neutral-700 text-neutral-500"
                          : row.status === "ambiguous"
                            ? "bg-amber-500/15 text-amber-500"
                            : "bg-red-500/15 text-red-400"
                    }`}
                  >
                    {row.status === "new"
                      ? "New"
                      : row.status === "exists"
                        ? "Already linked"
                        : row.status === "ambiguous"
                          ? "Needs review"
                          : row.status === "invalid"
                            ? "Invalid"
                            : "Not found"}
                  </span>
                </div>

                {row.status === "ambiguous" &&
                  (() => {
                    const sifuMatch = row.sifu;
                    const studentMatch = row.student;
                    return (
                      <div className="mt-1.5 ml-6 flex flex-wrap items-center gap-2">
                        {sifuMatch.status === "ambiguous" && (
                          <>
                            <span className="text-[11px] text-neutral-500">
                              &ldquo;{row.sifuName}&rdquo; matches {sifuMatch.candidates.length}:
                            </span>
                            {sifuMatch.candidates.map((c) => (
                              <button
                                key={c.id}
                                onClick={() =>
                                  setPicks((prev) => ({ ...prev, [index]: { ...prev[index], sifu: c.id } }))
                                }
                                className={`rounded-full border px-2.5 py-1 text-[11px] ${
                                  selectedCandidateId(sifuMatch.candidates, picks[index]?.sifu) === c.id
                                    ? "border-red-700 bg-red-700 text-white"
                                    : "border-neutral-700 text-neutral-300"
                                }`}
                              >
                                {c.name}
                              </button>
                            ))}
                          </>
                        )}
                        {studentMatch.status === "ambiguous" && (
                          <>
                            <span className="text-[11px] text-neutral-500">
                              &ldquo;{row.studentName}&rdquo; matches {studentMatch.candidates.length}:
                            </span>
                            {studentMatch.candidates.map((c) => (
                              <button
                                key={c.id}
                                onClick={() =>
                                  setPicks((prev) => ({ ...prev, [index]: { ...prev[index], student: c.id } }))
                                }
                                className={`rounded-full border px-2.5 py-1 text-[11px] ${
                                  selectedCandidateId(studentMatch.candidates, picks[index]?.student) === c.id
                                    ? "border-red-700 bg-red-700 text-white"
                                    : "border-neutral-700 text-neutral-300"
                                }`}
                              >
                                {c.name}
                              </button>
                            ))}
                          </>
                        )}
                      </div>
                    );
                  })()}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
