import { NextResponse } from "next/server";

// A raw exception's `.message` can carry an upstream response body, a
// missing-API-key hint, or other internals that don't belong in a client
// response. Log the real error server-side and return a generic one instead.
export function tmdbErrorResponse(context: string, error: unknown) {
  console.error(context, error);
  return NextResponse.json({ error: "TMDB request failed. Try again shortly." }, { status: 502 });
}
