import { prisma } from "@/lib/prisma";

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;
const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;

export function isValidUsername(username: string): boolean {
  return (
    username.length >= USERNAME_MIN_LENGTH &&
    username.length <= USERNAME_MAX_LENGTH &&
    USERNAME_PATTERN.test(username)
  );
}

// OAuth sign-ups have no registration form to ask the member directly, so we
// derive a starting username from their email's local part and suffix it if
// taken. Not used by credentials registration, where the member picks their
// own username up front.
export async function generateUniqueUsername(seed: string): Promise<string> {
  const base = (
    seed.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, USERNAME_MAX_LENGTH) || "user"
  ).padEnd(USERNAME_MIN_LENGTH, "0");

  let candidate = base;
  let suffix = 1;
  // Candidates here are always already-lowercase (derived from an
  // all-lowercase base), so checking against usernameLower directly is
  // correct without an extra .toLowerCase() call.
  while (await prisma.user.findUnique({ where: { usernameLower: candidate } })) {
    const suffixStr = String(suffix);
    candidate = `${base.slice(0, USERNAME_MAX_LENGTH - suffixStr.length)}${suffixStr}`;
    suffix += 1;
  }
  return candidate;
}
