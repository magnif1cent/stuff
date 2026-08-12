const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

export interface ParsedYoutubeLink {
  videoId: string;
  startSeconds: number | null;
}

// Accepts whatever a member pastes from YouTube's address bar or Share button:
// watch/shorts/embed/live URLs and youtu.be short links, with an optional
// t=/start= timestamp (either plain seconds or YouTube's "1h2m3s" form) that
// captures "start at this moment" if the member used Share's "start at" option.
export function parseYoutubeUrl(input: string): ParsedYoutubeLink | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^(www\.|m\.)/, "");
  let videoId: string | null = null;

  if (host === "youtu.be") {
    videoId = url.pathname.split("/")[1] ?? null;
  } else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (url.pathname === "/watch") {
      videoId = url.searchParams.get("v");
    } else if (url.pathname.startsWith("/shorts/")) {
      videoId = url.pathname.split("/")[2] ?? null;
    } else if (url.pathname.startsWith("/embed/")) {
      videoId = url.pathname.split("/")[2] ?? null;
    } else if (url.pathname.startsWith("/live/")) {
      videoId = url.pathname.split("/")[2] ?? null;
    }
  }

  if (!videoId || !VIDEO_ID_PATTERN.test(videoId)) {
    return null;
  }

  const startSeconds = parseTimestamp(url.searchParams.get("t") ?? url.searchParams.get("start"));

  return { videoId, startSeconds };
}

function parseTimestamp(raw: string | null): number | null {
  if (!raw) return null;
  if (/^\d+$/.test(raw)) return parseInt(raw, 10);

  const match = raw.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (!match || (!match[1] && !match[2] && !match[3])) return null;

  const [, h, m, s] = match;
  return parseInt(h ?? "0", 10) * 3600 + parseInt(m ?? "0", 10) * 60 + parseInt(s ?? "0", 10);
}

export function youtubeEmbedUrl(videoId: string, startSeconds?: number | null): string {
  const params = new URLSearchParams();
  if (startSeconds) params.set("start", String(startSeconds));
  const query = params.toString();
  return `https://www.youtube-nocookie.com/embed/${videoId}${query ? `?${query}` : ""}`;
}

export function youtubeWatchUrl(videoId: string, startSeconds?: number | null): string {
  const params = new URLSearchParams({ v: videoId });
  if (startSeconds) params.set("t", `${startSeconds}s`);
  return `https://www.youtube.com/watch?${params.toString()}`;
}

export function youtubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

// YouTube's public oEmbed endpoint needs no API key/quota, unlike the Data
// API — good enough for "suggest a title the submitter can overwrite."
// Returns null on any failure (private/deleted video, network error) so
// callers can fall back to asking the submitter to type their own title.
export async function fetchYoutubeTitle(videoId: string): Promise<string | null> {
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`;

  try {
    const res = await fetch(oembedUrl);
    if (!res.ok) return null;
    const body = await res.json();
    return typeof body.title === "string" ? body.title : null;
  } catch {
    return null;
  }
}
