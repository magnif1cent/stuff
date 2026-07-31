import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export async function createVerificationToken(email: string) {
  // Drop any earlier outstanding tokens for this email so only the most
  // recently sent link works, and the table doesn't accumulate dead rows.
  await prisma.verificationToken.deleteMany({ where: { identifier: email } });

  const token = crypto.randomBytes(32).toString("hex");
  await prisma.verificationToken.create({
    data: { identifier: email, token, expires: new Date(Date.now() + TOKEN_TTL_MS) },
  });

  return token;
}

export function buildVerificationUrl(token: string) {
  const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return `${base}/verify-email?token=${token}`;
}

export async function isEmailVerified(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { emailVerified: true } });
  return !!user?.emailVerified;
}
