import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, MIN_PASSWORD_LENGTH } from "@/lib/password";

export async function POST(request: Request) {
  const { token, password } = await request.json();

  if (typeof token !== "string" || !token) {
    return NextResponse.json({ error: "Missing reset token." }, { status: 400 });
  }
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` },
      { status: 400 },
    );
  }

  const record = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!record || record.expires < new Date()) {
    if (record) {
      await prisma.passwordResetToken.delete({ where: { token } }).catch(() => {});
    }
    return NextResponse.json({ error: "This reset link is invalid or has expired." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: record.identifier } });
  if (!user) {
    await prisma.passwordResetToken.delete({ where: { token } }).catch(() => {});
    return NextResponse.json({ error: "This reset link is invalid or has expired." }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  // Single-use: consume this token and any other outstanding ones for the
  // same account so an old, unused link can't reset the password again later.
  await prisma.passwordResetToken.deleteMany({ where: { identifier: record.identifier } });

  return NextResponse.json({ ok: true });
}
