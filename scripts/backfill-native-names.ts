// One-off backfill for actors imported before the Wikidata native-name
// feature shipped (PR #193) -- importMovieFromTmdb only ever fetches a
// native name on a brand-new Person row (see DECISIONS.md), so every actor
// already in the catalog beforehand has nativeName/nativeNameLanguage
// sitting null and nothing in the normal app flow will ever revisit them.
//
// Deliberately capped via --limit (default 5), with a --dry-run that does
// zero writes, rather than backfilling the whole table in one run -- each
// row costs a Neon write plus two outbound calls (TMDB, then Wikidata), so
// a small test batch confirms the data looks right before spending a full
// pass over the catalog.
//
// Usage (same TMDB_API_KEY as the app, your real DATABASE_URL):
//   TMDB_API_KEY=... DATABASE_URL=... npx tsx scripts/backfill-native-names.ts --dry-run
//   TMDB_API_KEY=... DATABASE_URL=... npx tsx scripts/backfill-native-names.ts --limit 5
//
// Known limitations, carried over from the live feature (see DECISIONS.md):
// - A "no Wikidata match" result is stored the same as "never checked" (both
//   null) -- re-running this keeps re-querying the same not-found actors
//   forever rather than skipping them after one try. Fine for a small test
//   batch; worth a real "checked, found nothing" sentinel (e.g. a separate
//   nativeNameCheckedAt column) before running this against the whole
//   catalog, so a full pass doesn't re-spend calls on known misses.
// - Coverage gaps are expected, not a bug (Michelle Yeoh had no P1559 claim
//   on Wikidata either, in testing).

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getTmdbPersonDetails } from "../src/lib/tmdb";
import { getWikidataNativeName } from "../src/lib/wikidata";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function parseArgs() {
  const args = process.argv.slice(2);
  const limitIndex = args.indexOf("--limit");
  const limit = limitIndex !== -1 ? Number(args[limitIndex + 1]) : 5;
  const dryRun = args.includes("--dry-run");
  return { limit, dryRun };
}

async function main() {
  const { limit, dryRun } = parseArgs();
  if (!Number.isInteger(limit) || limit <= 0) {
    throw new Error(`--limit must be a positive integer, got: ${limit}`);
  }

  // See "Known limitations" above: null here means either "never checked"
  // or "checked, found nothing" -- there's no way to tell them apart yet.
  const candidates = await prisma.person.findMany({
    where: { nativeName: null },
    orderBy: { tmdbId: "asc" },
    take: limit,
  });

  console.log(
    `Found ${candidates.length} candidate(s) (limit ${limit})${dryRun ? " -- dry run, no writes" : ""}.\n`,
  );

  let updated = 0;
  let skipped = 0;
  for (const person of candidates) {
    try {
      const details = await getTmdbPersonDetails(person.tmdbId);
      if (!details.imdb_id) {
        console.log(`- ${person.name} (tmdbId ${person.tmdbId}): no imdb_id on TMDB, skipping`);
        skipped++;
        continue;
      }
      const native = await getWikidataNativeName(details.imdb_id);
      if (!native) {
        console.log(`- ${person.name} (tmdbId ${person.tmdbId}): no Wikidata match, skipping`);
        skipped++;
        continue;
      }
      console.log(`- ${person.name} (tmdbId ${person.tmdbId}): ${native.name} [${native.language}]`);
      if (!dryRun) {
        await prisma.person.update({
          where: { id: person.id },
          data: { nativeName: native.name, nativeNameLanguage: native.language },
        });
      }
      updated++;
    } catch (err) {
      console.log(`- ${person.name} (tmdbId ${person.tmdbId}): ERROR ${(err as Error).message}`);
      skipped++;
    }
  }

  console.log(`\nDone. ${updated} updated, ${skipped} skipped/no-match, out of ${candidates.length} checked.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
