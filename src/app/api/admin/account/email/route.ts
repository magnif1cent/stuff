import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireAdminSession } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";
import { createVerificationToken, buildVerificationUrl } from "@/lib/verification";
import { sendVerificationEmail } from "@/lib/email";

export async function PATCH(request: Request) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { newEmail, currentPassword } = await request.json();
  if (typeof newEmail !== "string" || !newEmail.trim().includes("@")) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }
  const trimmedEmail = newEmail.trim();

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  if (user.passwordHash) {
    if (typeof currentPassword !== "string" || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 403 });
    }
  }

  if (trimmedEmail === user.email) {
    return NextResponse.json({ error: "That's already your email." }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email: trimmedEmail } });
  if (existing) {
    return NextResponse.json({ error: "That email is already in use." }, { status: 409 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { email: trimmedEmail, emailVerified: null },
  });

  try {
    const token = await createVerificationToken(trimmedEmail);
    await sendVerificationEmail(trimmedEmail, buildVerificationUrl(token));
  } catch (error) {
    // Don't fail the email change over a flaky email provider — the address
    // is updated either way, and the unverified-email banner offers a resend
    // path once the admin signs back in.
    console.error("Failed to send verification email:", error);
  }

  return NextResponse.json({ ok: true });
}
