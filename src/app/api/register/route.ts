import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createVerificationToken, buildVerificationUrl } from "@/lib/verification";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(request: Request) {
  const { name, email, password } = await request.json();

  if (typeof email !== "string" || typeof password !== "string" || password.length < 8) {
    return NextResponse.json(
      { error: "Email and a password of at least 8 characters are required." },
      { status: 400 },
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      name: typeof name === "string" && name.trim() ? name.trim() : null,
      email,
      passwordHash,
    },
  });

  try {
    const token = await createVerificationToken(email);
    await sendVerificationEmail(email, buildVerificationUrl(token));
  } catch (error) {
    // Don't fail account creation over a flaky email provider — the account
    // exists either way, and the unverified-email banner offers a resend path.
    console.error("Failed to send verification email:", error);
  }

  return NextResponse.json({ id: user.id, email: user.email });
}
