// One-off maintenance script, not part of the deployed app -- run locally
// against a real database with `npm run backfill-era-settings` (dry run) or
// `npm run backfill-era-settings -- --apply` (writes).
//
// For every APPROVED movie with no `eraSetting` yet, asks Claude to guess
// which historical period the movie's STORY is set in (not its release
// year) from its title/overview/release year, using the real ERA_SETTINGS
// vocabulary so the guesses can never drift from what the app actually
// accepts. Only "high confidence" guesses get written -- everything else
// (including any Claude can't reasonably infer, which it's told to say
// explicitly rather than force a guess) is left alone and logged for a
// human to look at. Existing member-set values are never touched: this
// only fills in movies eraSetting is still null on.
//
// Requires ANTHROPIC_API_KEY -- not otherwise used by this app, so it's
// not in .env.example; export it in your shell before running this.
// Requires DATABASE_URL, same as prisma/seed.ts.
//
// Writes go through the same accountability trail a member's own edit
// would (an EraSettingEdit row), so every filled-in guess still shows up
// in the movie's own "History" list -- attributed to whichever user id you
// pass as EDITOR_USER_ID, since there's no real acting member for a script.
// Find your own id with:
//   SELECT id, username FROM "User" WHERE email = 'you@example.com';

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { ERA_SETTINGS, isEraSettingKey, type EraSettingKey } from "../src/lib/era-settings";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const APPLY = process.argv.includes("--apply");
const LIMIT_ARG = process.argv.find((a) => a.startsWith("--limit="));
const LIMIT = LIMIT_ARG ? Number(LIMIT_ARG.split("=")[1]) : undefined;
const EDITOR_USER_ID = process.env.EDITOR_USER_ID;
const MODEL = process.env.CLASSIFIER_MODEL || "claude-opus-5";
const CONCURRENCY = 5;

if (APPLY && !EDITOR_USER_ID) {
  console.error("Refusing to write: set EDITOR_USER_ID to the user id these edits should be attributed to.");
  console.error(`Find it with: SELECT id, username FROM "User" WHERE email = 'you@example.com';`);
  process.exit(1);
}
if (!process.env.ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY is not set.");
  process.exit(1);
}

const eraList = ERA_SETTINGS.filter((e) => e.key !== "OTHER")
  .map((e) => `- ${e.key}: ${e.label}`)
  .join("\n");

const SYSTEM_PROMPT = `You classify which historical period a martial arts movie's STORY is set in -- not its real-world release year. Pick from exactly this list (key: description):

${eraList}
- OTHER: the setting doesn't fit any period above, or the movie has no identifiable historical/period setting at all (contemporary-set movies with no distinguishing "current day" markers still usually belong in CONTEMPORARY, not OTHER -- use OTHER only when you genuinely can't place it)

Respond with ONLY a JSON object, no other text:
{"eraKey": "<one key from the list above, or null>", "confidence": "high" | "medium" | "low", "reasoning": "<one short sentence>"}

Use "eraKey": null with "confidence": "low" whenever the title and overview don't give you enough to be reasonably sure -- a wrong guess is worse than no guess. Reserve "high" confidence for cases where the setting is stated or unambiguous from what you know of the film or its synopsis.`;

interface Guess {
  eraKey: EraSettingKey | null;
  confidence: "high" | "medium" | "low";
  reasoning: string;
}

async function classifyMovie(movie: { title: string; overview: string | null; releaseDate: Date | null }): Promise<Guess | null> {
  const year = movie.releaseDate ? movie.releaseDate.getFullYear() : "unknown";
  const userContent = `Title: ${movie.title}\nRelease year: ${year}\nOverview: ${movie.overview ?? "(none available)"}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 300,
      output_config: { effort: "low" }, // a short classification call, not worth full effort
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
    }),
  });

  if (!res.ok) {
    console.error(`  API error ${res.status} for "${movie.title}": ${await res.text()}`);
    return null;
  }

  const data = await res.json();
  const text = data.content?.find((b: { type: string }) => b.type === "text")?.text;
  if (!text) return null;

  try {
    const parsed = JSON.parse(text.trim());
    if (parsed.eraKey !== null && !isEraSettingKey(parsed.eraKey)) {
      console.error(`  Unrecognized era key "${parsed.eraKey}" for "${movie.title}" -- treating as no guess.`);
      return { eraKey: null, confidence: "low", reasoning: parsed.reasoning ?? "" };
    }
    return parsed as Guess;
  } catch {
    console.error(`  Couldn't parse response for "${movie.title}": ${text}`);
    return null;
  }
}

async function runWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function main() {
  const movies = await prisma.movie.findMany({
    where: { status: "APPROVED", eraSetting: null },
    select: { id: true, title: true, overview: true, releaseDate: true },
    take: LIMIT,
  });

  console.log(`${movies.length} movie(s) with no historical setting yet.${APPLY ? "" : " (dry run -- pass --apply to write)"}`);
  if (movies.length === 0) return;

  let applied = 0;
  let skippedLowConfidence = 0;
  let skippedNoGuess = 0;
  let errored = 0;
  const report: Array<{ id: string; title: string; releaseYear: number | null; guess: Guess | null; applied: boolean }> = [];

  await runWithConcurrency(movies, CONCURRENCY, async (movie) => {
    const guess = await classifyMovie(movie);
    const releaseYear = movie.releaseDate ? movie.releaseDate.getFullYear() : null;

    if (!guess) {
      errored++;
      report.push({ id: movie.id, title: movie.title, releaseYear, guess: null, applied: false });
      return;
    }
    if (!guess.eraKey) {
      skippedNoGuess++;
      report.push({ id: movie.id, title: movie.title, releaseYear, guess, applied: false });
      return;
    }
    if (guess.confidence !== "high") {
      skippedLowConfidence++;
      report.push({ id: movie.id, title: movie.title, releaseYear, guess, applied: false });
      return;
    }

    console.log(`  ${movie.title} (${releaseYear ?? "?"}) -> ${guess.eraKey}  [${guess.reasoning}]`);

    if (APPLY) {
      await prisma.$transaction([
        prisma.movie.update({ where: { id: movie.id }, data: { eraSetting: guess.eraKey } }),
        prisma.eraSettingEdit.create({
          data: { movieId: movie.id, editedById: EDITOR_USER_ID!, previousValue: null, newValue: guess.eraKey },
        }),
      ]);
    }
    applied++;
    report.push({ id: movie.id, title: movie.title, releaseYear, guess, applied: APPLY });
  });

  const fs = await import("fs");
  const reportPath = `era-backfill-report-${Date.now()}.json`;
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(`\n${APPLY ? "Applied" : "Would apply"}: ${applied}`);
  console.log(`Skipped (low/medium confidence): ${skippedLowConfidence}`);
  console.log(`Skipped (no guess possible): ${skippedNoGuess}`);
  console.log(`Errored: ${errored}`);
  console.log(`Full report: ${reportPath}`);
  if (!APPLY && applied > 0) {
    console.log(`\nRe-run with --apply (and EDITOR_USER_ID set) to write the ${applied} high-confidence guess(es).`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
