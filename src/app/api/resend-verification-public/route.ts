import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createVerificationToken, buildVerificationUrl } from "@/lib/verification";
import { sendVerificationEmail } from "@/lib/email";
import { checkRateLimit, getClientIp, resendVerificationPublicLimiter } from "@/lib/rate-limit";
import { verifyCaptcha } from "@/lib/captcha";

// Unauthenticated counterpart to /api/resend-verification: reachable from the
// login page for a member who is blocked at sign-in because their account
// isn't verified yet and has no other way to get a fresh link. Same
// anti-enumeration shape as /api/forgot-password — always the same response,
// and only sends an email when there's an actual unverified credentials
// account behind the address.
export async function POST(request: Request) {
  const rateLimit = await checkRateLimit(resendVerificationPublicLimiter, getClientIp(request));
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "Too many requests. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  const { email, captchaToken } = await request.json();
  if (typeof email !== "string" || !email.trim()) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }

  if (!(await verifyCaptcha(captchaToken))) {
    return NextResponse.json({ error: "Captcha verification failed. Try again." }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();

  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (user?.passwordHash && !user.emailVerified) {
    const token = await createVerificationToken(normalizedEmail);
    await sendVerificationEmail(normalizedEmail, buildVerificationUrl(token));
  }

  return NextResponse.json({ ok: true });
}
