"use client";

import { useRef, useState } from "react";

interface BulkImportResult {
  tmdbId: number;
  status: "imported" | "skipped" | "error";
  title?: string;
  error?: string;
}

const CHUNK_SIZE = 10;

function parseTmdbIds(text: string): number[] {
  const ids = text
    .split(/[^0-9]+/)
    .filter(Boolean)
    .map((s) => Number(s));
  return [...new Set(ids)];
}

export function AdminBulkImport() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [ids, setIds] = useState<number[]>([]);
  const [running, setRunning] = useState(false);
  const [processed, setProcessed] = useState(0);
  const [imported, setImported] = useState(0);
  const [skipped, setSkipped] = useState(0);
  const [failures, setFailures] = useState<BulkImportResult[]>([]);
  const cancelRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setProcessed(0);
    setImported(0);
    setSkipped(0);
    setFailures([]);

    const reader = new FileReader();
    reader.onload = () => setIds(parseTmdbIds(String(reader.result ?? "")));
    reader.readAsText(file);
  }

  async function startImport() {
    setRunning(true);
    cancelRef.current = false;
    setProcessed(0);
    setImported(0);
    setSkipped(0);
    setFailures([]);

    for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
      if (cancelRef.current) break;
      const chunk = ids.slice(i, i + CHUNK_SIZE);

      try {
        const res = await fetch("/api/admin/tmdb/bulk-import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tmdbIds: chunk }),
        });
        const body = await res.json();
        if (!res.ok) {
          setFailures((f) => [...f, ...chunk.map((tmdbId) => ({ tmdbId, status: "error" as const, error: body.error ?? "Request failed" }))]);
        } else {
          const results = body.results as BulkImportResult[];
          setImported((n) => n + results.filter((r) => r.status === "imported").length);
          setSkipped((n) => n + results.filter((r) => r.status === "skipped").length);
          setFailures((f) => [...f, ...results.filter((r) => r.status === "error")]);
        }
      } catch {
        setFailures((f) => [...f, ...chunk.map((tmdbId) => ({ tmdbId, status: "error" as const, error: "Network error" }))]);
      }

      setProcessed((n) => n + chunk.length);
    }

    setRunning(false);
  }

  function cancelImport() {
    cancelRef.current = true;
  }

  function reset() {
    setFileName(null);
    setIds([]);
    setProcessed(0);
    setImported(0);
    setSkipped(0);
    setFailures([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function copyFailedIds() {
    await navigator.clipboard.writeText(failures.map((f) => f.tmdbId).join("\n"));
  }

  const total = ids.length;
  const done = processed >= total && total > 0;
  const progressPct = total > 0 ? Math.round((processed / total) * 100) : 0;

  return (
    <div className="rounded-md border border-neutral-800 bg-neutral-900 p-4">
      <h2 className="mb-1 text-lg font-semibold text-white">Bulk import from file</h2>
      <p className="mb-4 text-sm text-neutral-400">
        Upload a .txt or .csv file containing TMDB movie IDs (any separator — one per line, comma-separated,
        or mixed). Movies already in the catalog are skipped without an extra TMDB request.
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.csv,text/plain,text/csv"
        onChange={handleFile}
        disabled={running}
        className="mb-3 block text-sm text-neutral-300 file:mr-3 file:rounded-md file:border-0 file:bg-neutral-800 file:px-3 file:py-1.5 file:text-sm file:text-neutral-100 hover:file:bg-neutral-700"
      />

      {fileName && (
        <p className="mb-3 text-sm text-neutral-400">
          {fileName}: found <span className="text-neutral-100">{total}</span> unique TMDB ID{total === 1 ? "" : "s"}.
        </p>
      )}

      {fileName && total > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          {!running ? (
            <button
              type="button"
              onClick={startImport}
              className="rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
            >
              {done ? "Import again" : "Start import"}
            </button>
          ) : (
            <button
              type="button"
              onClick={cancelImport}
              className="rounded-md border border-neutral-700 px-4 py-2 text-sm text-neutral-100 hover:bg-neutral-800"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={reset}
            disabled={running}
            className="rounded-md border border-neutral-700 px-4 py-2 text-sm text-neutral-100 hover:bg-neutral-800 disabled:opacity-50"
          >
            Clear
          </button>
        </div>
      )}

      {(running || processed > 0) && total > 0 && (
        <div className="mt-4">
          <div className="mb-1 h-2 w-full overflow-hidden rounded-full bg-neutral-800">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-sm text-neutral-400">
            {processed} / {total} processed — {imported} imported, {skipped} skipped, {failures.length} failed
            {running && processed < total ? " (running…)" : ""}
            {!running && processed < total ? " (cancelled)" : ""}
          </p>
        </div>
      )}

      {failures.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-medium text-white">Failed ({failures.length})</h3>
            <button type="button" onClick={copyFailedIds} className="text-sm text-accent hover:underline">
              Copy failed IDs
            </button>
          </div>
          <ul className="max-h-48 overflow-y-auto rounded-md border border-neutral-800 text-sm">
            {failures.map((f) => (
              <li key={f.tmdbId} className="border-b border-neutral-800 px-3 py-1.5 last:border-b-0">
                <span className="text-neutral-100">{f.tmdbId}</span>{" "}
                <span className="text-neutral-500">{f.error}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
