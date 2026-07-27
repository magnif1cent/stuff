import { NextResponse } from "next/server";
import { computeWeeklyFeatured } from "@/lib/weekly-featured";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await computeWeeklyFeatured();
  return NextResponse.json(result);
}
