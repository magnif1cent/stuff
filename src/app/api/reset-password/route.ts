import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, validateNewPassword } from "@/lib/password";

export async function POST(request: Request) {
  const { token, password } = await request.json();

  if (typeof token !== "string" || !token) {
    return NextResponse.json({ error: "Missing reset token." }, { status: 400 });
  }
  const passwordCheck = await validateNewPassword(password);
  if (!passwordCheck.valid) {
    return NextResponse.json({ error: passwordCheck.error }, { status: 400 });
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
  // Setting passwordChangedAt here is the actual point of this endpoint's
  // existence, not an afterthought — it's what makes the JWT callback
  // invalidate every other session on the account (a stolen cookie, a
  // forgotten logged-in device) rather than just changing the password
  // while they keep working.
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash, passwordChangedAt: new Date() } });

  // Single-use: consume this token and any other outstanding ones for the
  // same account so an old, unused link can't reset the password again later.
  await prisma.passwordResetToken.deleteMany({ where: { identifier: record.identifier } });

  return NextResponse.json({ ok: true });
}
