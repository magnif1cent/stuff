const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

// Optional, same pattern as every other external service in this app: without
// TURNSTILE_SECRET_KEY configured (local dev, CI), this no-ops as "verified"
// rather than blocking every submission — the widget itself also doesn't
// render client-side when NEXT_PUBLIC_TURNSTILE_SITE_KEY is unset, so the two
// stay consistent.
export async function verifyCaptcha(token: unknown): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  if (!secretKey) return true;

  if (typeof token !== "string" || !token) return false;

  const res = await fetch(TURNSTILE_VERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret: secretKey, response: token }),
  });
  if (!res.ok) return false;

  const data = await res.json();
  return data.success === true;
}
