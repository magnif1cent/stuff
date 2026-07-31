import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { parseYoutubeUrl, fetchYoutubeTitle } from "@/lib/youtube";

// Convenience lookup so the fight-scene form can suggest a title as soon as a
// member pastes a YouTube link. Signed-in gate only (not verified-email) —
// it has no side effects, this just avoids leaving it as an open relay.
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const url = new URL(request.url).searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "url is required." }, { status: 400 });
  }

  const parsed = parseYoutubeUrl(url);
  if (!parsed) {
    return NextResponse.json({ title: null });
  }

  const title = await fetchYoutubeTitle(parsed.videoId);
  return NextResponse.json({ title });
}
