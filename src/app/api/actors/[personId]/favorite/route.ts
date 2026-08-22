import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isEmailVerified } from "@/lib/verification";

export async function POST(request: Request, { params }: { params: Promise<{ personId: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in to manage your favorites." }, { status: 401 });
  }
  if (!(await isEmailVerified(session.user.id))) {
    return NextResponse.json({ error: "Verify your email before managing favorites." }, { status: 403 });
  }

  const { personId } = await params;

  const person = await prisma.person.findUnique({ where: { id: personId }, select: { id: true } });
  if (!person) {
    return NextResponse.json({ error: "Actor not found." }, { status: 404 });
  }

  const existing = await prisma.personFavorite.findUnique({
    where: { userId_personId: { userId: session.user.id, personId } },
  });

  if (existing) {
    await prisma.personFavorite.delete({ where: { id: existing.id } });
    const count = await prisma.personFavorite.count({ where: { personId } });
    return NextResponse.json({ active: false, count });
  }

  await prisma.personFavorite.create({ data: { userId: session.user.id, personId } });
  const count = await prisma.personFavorite.count({ where: { personId } });
  return NextResponse.json({ active: true, count });
}
