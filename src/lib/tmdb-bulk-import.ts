import { prisma } from "@/lib/prisma";
import { searchTmdbMovies } from "@/lib/tmdb";
import { importMovieFromTmdb } from "@/lib/tmdb-import";

export const MAX_BULK_IMPORT_ROWS = 25;

export type BulkImportRowInput = {
  title?: string;
  year?: string;
  tmdb_id?: string;
};

export type BulkImportRowResult = {
  row: number;
  input: string;
  status: "created" | "updated" | "error";
  message: string;
};

async function resolveTmdbId(row: BulkImportRowInput): Promise<{ tmdbId: number } | { error: string }> {
  const rawId = row.tmdb_id?.trim();
  if (rawId) {
    const parsed = Number(rawId);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return { error: `"${rawId}" isn't a valid tmdb_id.` };
    }
    return { tmdbId: parsed };
  }

  const title = row.title?.trim();
  if (!title) {
    return { error: "Row needs a title or tmdb_id." };
  }

  const year = row.year?.trim();
  const results = await searchTmdbMovies(title);
  const match = year ? (results.find((r) => r.release_date?.startsWith(year)) ?? null) : (results[0] ?? null);

  if (!match) {
    return { error: `No TMDB match found for "${title}"${year ? ` (${year})` : ""}.` };
  }
  return { tmdbId: match.id };
}

function rowLabel(row: BulkImportRowInput) {
  const tmdbId = row.tmdb_id?.trim();
  if (tmdbId) return `tmdb_id ${tmdbId}`;
  const title = row.title?.trim();
  if (!title) return "(blank row)";
  const year = row.year?.trim();
  return year ? `${title} (${year})` : title;
}

// Sequential on purpose: TMDB's rate limits and importMovieFromTmdb's own
// sequential per-cast-member upserts make parallel rows more likely to hit
// rate limits than to finish meaningfully faster, and a bounded row count
// (MAX_BULK_IMPORT_ROWS) keeps the total well inside a serverless timeout.
export async function bulkImportFromTmdb(rows: BulkImportRowInput[]): Promise<BulkImportRowResult[]> {
  const results: BulkImportRowResult[] = [];

  for (const [index, row] of rows.entries()) {
    const label = rowLabel(row);

    // Resolution (a TMDB search) and import (a TMDB details fetch + DB
    // writes) both hit the network, so both need to land in this row's
    // result on failure rather than throw — one bad row (rate limit,
    // transient TMDB error) must not abort every other row in the batch.
    try {
      const resolved = await resolveTmdbId(row);
      if ("error" in resolved) {
        results.push({ row: index + 1, input: label, status: "error", message: resolved.error });
        continue;
      }

      const existing = await prisma.movie.findUnique({
        where: { tmdbId: resolved.tmdbId },
        select: { id: true },
      });
      const movie = await importMovieFromTmdb(resolved.tmdbId);
      results.push({
        row: index + 1,
        input: label,
        status: existing ? "updated" : "created",
        message: movie.title,
      });
    } catch (error) {
      results.push({ row: index + 1, input: label, status: "error", message: (error as Error).message });
    }
  }

  return results;
}
