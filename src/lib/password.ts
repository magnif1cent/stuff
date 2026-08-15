import bcrypt from "bcryptjs";

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
  return { valid: true };
}
