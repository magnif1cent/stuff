import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour — shorter than email verification's

export async function createPasswordResetToken(email: string) {
  // Drop any earlier outstanding tokens for this email so only the most
  // recently requested link works, and an old, forgotten link can't be used
  // later to take over the account.
  await prisma.passwordResetToken.deleteMany({ where: { identifier: email } });

  const token = crypto.randomBytes(32).toString("hex");
  await prisma.passwordResetToken.create({
    data: { identifier: email, token, expires: new Date(Date.now() + TOKEN_TTL_MS) },
  });

  return token;
}

export function buildPasswordResetUrl(token: string) {
  const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return `${base}/reset-password?token=${token}`;
}
