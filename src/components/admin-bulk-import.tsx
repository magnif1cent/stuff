"use client";

import { useRef, useState } from "react";

type RowResult = {
  row: number;
  input: string;
  status: "created" | "updated" | "error";
  message: string;
};

const TEMPLATE_CSV = "title,year,tmdb_id\nIp Man,2008,\nDrunken Master,,11072\n";

export function AdminBulkImport() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<RowResult[] | null>(null);

  function downloadTemplate() {
    const blob = new Blob([TEMPLATE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "movie-import-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setResults(null);

    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/admin/tmdb/bulk-import", { method: "POST", body: formData });
    const body = await res.json().catch(() => ({}));
    setUploading(false);
    if (!res.ok) {
      setError(body.error ?? "Upload failed.");
      return;
    }
    setResults(body.results);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div>
      {/* Row cap is a UX hint only — src/lib/tmdb-bulk-import.ts's MAX_BULK_IMPORT_ROWS is what's enforced. */}
      <p className="mb-3 text-sm text-neutral-400">
        Upload a CSV with a <code className="rounded bg-neutral-800 px-1">title</code> column (optionally{" "}
        <code className="rounded bg-neutral-800 px-1">year</code> to disambiguate, or{" "}
        <code className="rounded bg-neutral-800 px-1">tmdb_id</code> to skip the search entirely). Up to 25 rows
        per upload.
      </p>
      <button
        type="button"
        onClick={downloadTemplate}
        className="mb-4 text-sm text-neutral-400 underline hover:text-white"
      >
        Download CSV template
      </button>

      <form onSubmit={handleSubmit} className="mb-4 flex flex-wrap gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          required
          className="min-w-0 flex-1 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-100 file:mr-3 file:rounded file:border-0 file:bg-neutral-800 file:px-2 file:py-1 file:text-neutral-100"
        />
        <button
          type="submit"
          disabled={uploading}
          className="shrink-0 rounded-md bg-red-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
        >
          {uploading ? "Importing…" : "Upload & import"}
        </button>
      </form>

      {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

      {results && (
        <ul className="flex flex-col gap-2">
          {results.map((r) => (
            <li
              key={r.row}
              className="flex items-center justify-between gap-2 rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm"
            >
              <span className="text-neutral-300">
                Row {r.row}: {r.input}
              </span>
              <span
                className={
                  r.status === "error" ? "text-red-400" : r.status === "created" ? "text-green-400" : "text-amber-400"
                }
              >
                {r.status === "error" ? r.message : `${r.status} — ${r.message}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
