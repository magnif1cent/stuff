import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BIO_MAX_LENGTH } from "@/lib/profile";

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { bio } = await request.json();
  if (typeof bio !== "string") {
    return NextResponse.json({ error: "A bio is required." }, { status: 400 });
  }

  const trimmedBio = bio.trim();
  if (trimmedBio.length > BIO_MAX_LENGTH) {
    return NextResponse.json({ error: `Bio must be ${BIO_MAX_LENGTH} characters or fewer.` }, { status: 400 });
  }

  // Empty clears the bio back to unset, rather than storing an empty string
  // — matches the profile page's "no bio set" placeholder logic.
  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { bio: trimmedBio || null },
  });
  return NextResponse.json({ bio: user.bio });
}
