import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireReviewerSession } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";
import { hashPassword, validateNewPassword } from "@/lib/password";

export async function PATCH(request: Request) {
  const session = await requireReviewerSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { currentPassword, newPassword } = await request.json();
  const passwordCheck = await validateNewPassword(newPassword);
  if (!passwordCheck.valid) {
    return NextResponse.json({ error: passwordCheck.error }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  if (user.passwordHash) {
    if (typeof currentPassword !== "string" || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 403 });
    }
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash, passwordChangedAt: new Date() } });

  return NextResponse.json({ ok: true });
}
