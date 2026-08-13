import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createPasswordResetToken, buildPasswordResetUrl } from "@/lib/password-reset";
import { sendPasswordResetEmail } from "@/lib/email";
import { checkRateLimit, getClientIp, forgotPasswordLimiter } from "@/lib/rate-limit";
import { verifyCaptcha } from "@/lib/captcha";

export async function POST(request: Request) {
  const rateLimit = await checkRateLimit(forgotPasswordLimiter, getClientIp(request));
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

  // Always the same response whether or not an account exists for this
  // email — this endpoint must never reveal account existence. Only send a
  // reset link when there's an actual password to reset: a Google-only
  // account has none, and offering to "reset" it would itself be a signal
  // that distinguishes it from a nonexistent email.
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (user?.passwordHash) {
    const token = await createPasswordResetToken(normalizedEmail);
    await sendPasswordResetEmail(normalizedEmail, buildPasswordResetUrl(token));
  }

  return NextResponse.json({ ok: true });
}
