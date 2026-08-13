import bcrypt from "bcryptjs";
import crypto from "node:crypto";

export const MIN_PASSWORD_LENGTH = 12;
// bcrypt silently truncates its input past 72 bytes — anything beyond that
// is never actually hashed, giving a false sense of extra strength from a
// longer password, and an unbounded max is also a cheap way to send
// oversized request bodies. Enforcing this makes the real limit explicit.
export const MAX_PASSWORD_LENGTH_BYTES = 72;

// 12 is the current OWASP-recommended minimum (bumped from 10) — bcrypt's
// work factor is exponential, so this is a deliberate cost/resistance
// tradeoff, not an arbitrary number.
const BCRYPT_COST = 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

const PWNED_PASSWORDS_RANGE_URL = "https://api.pwnedpasswords.com/range/";

// Checks the HaveIBeenPwned Pwned Passwords API using its k-anonymity
// model: only the first 5 hex characters of the password's SHA-1 hash ever
// leave this server — never the password itself, and not even its full
// hash — and the API returns every suffix sharing that prefix for a local
// match. No API key needed; it's a free, keyless public API. Network
// failures fail open (treated as "not known to be pwned") rather than
// blocking registration/reset over a third-party outage — the same
// fail-open posture as every other optional external service in this app,
// just without an env var to gate it since there's no account to set up.
export async function isPwnedPassword(password: string): Promise<boolean> {
  try {
    const sha1 = crypto.createHash("sha1").update(password, "utf8").digest("hex").toUpperCase();
    const prefix = sha1.slice(0, 5);
    const suffix = sha1.slice(5);

    const res = await fetch(`${PWNED_PASSWORDS_RANGE_URL}${prefix}`, {
      // Asks the API to mix in random padding entries, so a network
      // observer watching response sizes can't infer whether a real match
      // was found.
      headers: { "Add-Padding": "true" },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return false;

    const body = await res.text();
    return body.split("\n").some((line) => line.split(":")[0].trim() === suffix);
  } catch {
    return false;
  }
}

export interface PasswordValidationResult {
  valid: boolean;
  error?: string;
}

// Shared by every endpoint that sets a password (registration, admin
// password change, forgot-password reset) so the rules can't drift between
// them.
export async function validateNewPassword(password: unknown): Promise<PasswordValidationResult> {
  if (typeof password !== "string") {
    return { valid: false, error: "A password is required." };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { valid: false, error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` };
  }
  if (Buffer.byteLength(password, "utf8") > MAX_PASSWORD_LENGTH_BYTES) {
    return { valid: false, error: `Password must be ${MAX_PASSWORD_LENGTH_BYTES} characters or fewer.` };
  }
  if (await isPwnedPassword(password)) {
    return {
      valid: false,
      error: "This password has appeared in a known data breach. Choose a different one.",
    };
  }
  return { valid: true };
}
