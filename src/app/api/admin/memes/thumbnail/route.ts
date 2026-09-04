import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/require-admin";
import { VIDEO_ID_PATTERN, youtubeThumbnailUrl } from "@/lib/youtube";

// Streams the YouTube thumbnail back through our own origin instead of
// pointing the browser at img.youtube.com directly. img.youtube.com doesn't
// send permissive CORS headers, so an <img crossOrigin> drawn onto the meme
// generator's <canvas> would taint it and block canvas.toBlob() on export --
// proxying makes the image same-origin, sidestepping that entirely.
export async function GET(request: Request) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const videoId = new URL(request.url).searchParams.get("videoId") ?? "";
  if (!VIDEO_ID_PATTERN.test(videoId)) {
    return NextResponse.json({ error: "Invalid videoId." }, { status: 400 });
  }

  const upstream = await fetch(youtubeThumbnailUrl(videoId));
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: "Thumbnail unavailable." }, { status: 502 });
  }

  return new NextResponse(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "image/jpeg",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
