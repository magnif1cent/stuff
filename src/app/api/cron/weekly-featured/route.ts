import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { computeWeeklyFeatured } from "@/lib/weekly-featured";

function isAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;

  const authHeader = request.headers.get("authorization") ?? "";
  const expected = Buffer.from(`Bearer ${cronSecret}`);
  const actual = Buffer.from(authHeader);

  // Buffer lengths must match before timingSafeEqual can compare them, but
  // returning early on a length mismatch is itself timing-safe — it leaks
  // nothing more than a plain !== comparison already would.
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await computeWeeklyFeatured();
  return NextResponse.json(result);
}
