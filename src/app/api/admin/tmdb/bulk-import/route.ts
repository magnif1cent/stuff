import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";
import { importMovieFromTmdb } from "@/lib/tmdb-import";

// Kept small so one batch comfortably finishes inside a serverless
// function's default timeout — the client is responsible for chunking a
// large file into many requests of this size.
const MAX_BATCH_SIZE = 15;

interface BulkImportResult {
  tmdbId: number;
  status: "imported" | "skipped" | "error";
  title?: string;
  error?: string;
}

export async function POST(request: Request) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { tmdbIds } = await request.json();
  if (
    !Array.isArray(tmdbIds) ||
    tmdbIds.length === 0 ||
    !tmdbIds.every((id) => typeof id === "number" && Number.isInteger(id))
  ) {
    return NextResponse.json({ error: "tmdbIds must be a non-empty array of integers" }, { status: 400 });
  }
  if (tmdbIds.length > MAX_BATCH_SIZE) {
    return NextResponse.json({ error: `tmdbIds must contain at most ${MAX_BATCH_SIZE} ids per request` }, { status: 400 });
  }

  const existing = await prisma.movie.findMany({
    where: { tmdbId: { in: tmdbIds } },
    select: { tmdbId: true, title: true },
  });
  const existingByTmdbId = new Map(existing.map((m) => [m.tmdbId, m.title]));

  const results: BulkImportResult[] = [];
  for (const tmdbId of tmdbIds) {
    const existingTitle = existingByTmdbId.get(tmdbId);
    if (existingTitle) {
      results.push({ tmdbId, status: "skipped", title: existingTitle });
      continue;
    }

    try {
      const movie = await importMovieFromTmdb(tmdbId);
      results.push({ tmdbId, status: "imported", title: movie.title });
    } catch (error) {
      results.push({ tmdbId, status: "error", error: (error as Error).message });
    }
  }

  return NextResponse.json({ results });
}
