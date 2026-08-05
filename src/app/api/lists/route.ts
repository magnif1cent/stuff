import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isEmailVerified } from "@/lib/verification";
import { MAX_MEMBER_LISTS, MEMBER_LIST_NAME_MAX_LENGTH } from "@/lib/member-lists";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in to create a list." }, { status: 401 });
  }
  if (!(await isEmailVerified(session.user.id))) {
    return NextResponse.json({ error: "Verify your email before creating a list." }, { status: 403 });
  }

  const { name } = await request.json();
  if (typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "A list name is required." }, { status: 400 });
  }
  const trimmedName = name.trim();
  if (trimmedName.length > MEMBER_LIST_NAME_MAX_LENGTH) {
    return NextResponse.json(
      { error: `List name must be ${MEMBER_LIST_NAME_MAX_LENGTH} characters or fewer.` },
      { status: 400 },
    );
  }

  const listCount = await prisma.memberList.count({ where: { userId: session.user.id } });
  if (listCount >= MAX_MEMBER_LISTS) {
    return NextResponse.json({ error: `You can have at most ${MAX_MEMBER_LISTS} lists.` }, { status: 400 });
  }

  const existing = await prisma.memberList.findUnique({
    where: { userId_name: { userId: session.user.id, name: trimmedName } },
  });
  if (existing) {
    return NextResponse.json({ error: "You already have a list with that name." }, { status: 409 });
  }

  const list = await prisma.memberList.create({ data: { userId: session.user.id, name: trimmedName } });
  return NextResponse.json({ list });
}
