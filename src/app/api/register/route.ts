import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createVerificationToken, buildVerificationUrl } from "@/lib/verification";
import { sendVerificationEmail } from "@/lib/email";
import { isValidUsername, USERNAME_MAX_LENGTH, USERNAME_MIN_LENGTH } from "@/lib/username";

export async function POST(request: Request) {
  const { username, email, password } = await request.json();

  if (typeof email !== "string" || typeof password !== "string" || password.length < 8) {
    return NextResponse.json(
      { error: "Email and a password of at least 8 characters are required." },
      { status: 400 },
    );
  }

  if (typeof username !== "string" || !isValidUsername(username)) {
    return NextResponse.json(
      {
        error: `Username must be ${USERNAME_MIN_LENGTH}-${USERNAME_MAX_LENGTH} characters, using only lowercase letters, numbers, and underscores.`,
      },
      { status: 400 },
    );
  }

  // Normalize so "User@Example.com" and "user@example.com" are treated as
  // the same account — Postgres's default `=` comparison is case-sensitive.
  const normalizedEmail = email.trim().toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
  }

  const existingUsername = await prisma.user.findUnique({ where: { username } });
  if (existingUsername) {
    return NextResponse.json({ error: "That username is already taken." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      username,
      email: normalizedEmail,
      passwordHash,
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
