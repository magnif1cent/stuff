import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createVerificationToken, buildVerificationUrl } from "@/lib/verification";
import { sendVerificationEmail } from "@/lib/email";
import { isValidUsername, USERNAME_MAX_LENGTH, USERNAME_MIN_LENGTH } from "@/lib/username";
import { checkRateLimit, getClientIp, registerLimiter } from "@/lib/rate-limit";
import { verifyCaptcha } from "@/lib/captcha";
import { hashPassword, validateNewPassword } from "@/lib/password";

export async function POST(request: Request) {
  const rateLimit = await checkRateLimit(registerLimiter, getClientIp(request));
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "Too many registration attempts. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  const { username, email, password, captchaToken } = await request.json();

  if (typeof email !== "string") {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }

  const passwordCheck = await validateNewPassword(password);
  if (!passwordCheck.valid) {
    return NextResponse.json({ error: passwordCheck.error }, { status: 400 });
  }

  if (!(await verifyCaptcha(captchaToken))) {
    return NextResponse.json({ error: "Captcha verification failed. Try again." }, { status: 400 });
  }

  if (typeof username !== "string" || !isValidUsername(username)) {
    return NextResponse.json(
      {
        error: `Username must be ${USERNAME_MIN_LENGTH}-${USERNAME_MAX_LENGTH} characters, using only letters, numbers, and underscores.`,
      },
      { status: 400 },
    );
  }

  // Normalize so "User@Example.com" and "user@example.com" are treated as
  // the same account — Postgres's default `=` comparison is case-sensitive.
  const normalizedEmail = email.trim().toLowerCase();
  // Same idea for usernames: "NashPopoB" and "nashpopob" must be treated as
  // the same handle, even though the original casing is preserved for
  // display (username, below) — usernameLower is the real uniqueness key.
  const usernameLower = username.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
  }

  const existingUsername = await prisma.user.findUnique({ where: { usernameLower } });
  if (existingUsername) {
    return NextResponse.json({ error: "That username is already taken." }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      username,
      usernameLower,
      email: normalizedEmail,
      passwordHash,
      passwordChangedAt: new Date(),
    },
  });

  try {
    const token = await createVerificationToken(normalizedEmail);
    await sendVerificationEmail(normalizedEmail, buildVerificationUrl(token));
  } catch (error) {
    // Don't fail account creation over a flaky email provider — the account
    // exists either way, and the unverified-email banner offers a resend path.
    console.error("Failed to send verification email:", error);
  }

  return NextResponse.json({ id: user.id, email: user.email });
}
