import bcrypt from "bcryptjs";

export const MIN_PASSWORD_LENGTH = 8;

// 12 is the current OWASP-recommended minimum (bumped from 10) — bcrypt's
// work factor is exponential, so this is a deliberate cost/resistance
// tradeoff, not an arbitrary number.
const BCRYPT_COST = 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}
