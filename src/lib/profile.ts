export const BIO_MAX_LENGTH = 280;
export const LOCATION_MAX_LENGTH = 100;
export const WEBSITE_URL_MAX_LENGTH = 200;

export function isValidProfileUrl(url: string): boolean {
  if (url.length > WEBSITE_URL_MAX_LENGTH) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export type SocialPlatformId = "x" | "instagram" | "youtube" | "tiktok" | "facebook" | "reddit" | "letterboxd" | "website";

// Recognized by hostname only — the URL itself is still stored and linked
// verbatim, this just picks which icon/label to show alongside it. Anything
// unrecognized (including a malformed URL) falls back to the generic
// "Website" glyph rather than failing to render a link at all.
const SOCIAL_PLATFORMS_BY_HOSTNAME: Record<string, { id: SocialPlatformId; label: string }> = {
  "twitter.com": { id: "x", label: "X" },
  "x.com": { id: "x", label: "X" },
  "instagram.com": { id: "instagram", label: "Instagram" },
  "youtube.com": { id: "youtube", label: "YouTube" },
  "youtu.be": { id: "youtube", label: "YouTube" },
  "tiktok.com": { id: "tiktok", label: "TikTok" },
  "facebook.com": { id: "facebook", label: "Facebook" },
  "fb.com": { id: "facebook", label: "Facebook" },
  "reddit.com": { id: "reddit", label: "Reddit" },
  "letterboxd.com": { id: "letterboxd", label: "Letterboxd" },
};

export function detectSocialPlatform(url: string): { id: SocialPlatformId; label: string } {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    return SOCIAL_PLATFORMS_BY_HOSTNAME[hostname] ?? { id: "website", label: "Website" };
  } catch {
    return { id: "website", label: "Website" };
  }
}
