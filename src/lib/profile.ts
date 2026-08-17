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
