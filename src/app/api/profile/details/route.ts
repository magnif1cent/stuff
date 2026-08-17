import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BIO_MAX_LENGTH, LOCATION_MAX_LENGTH, isValidProfileUrl } from "@/lib/profile";

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { bio, location, websiteUrl } = await request.json();
  if (typeof bio !== "string" || typeof location !== "string" || typeof websiteUrl !== "string") {
    return NextResponse.json({ error: "Invalid profile details." }, { status: 400 });
  }

  const trimmedBio = bio.trim();
  if (trimmedBio.length > BIO_MAX_LENGTH) {
    return NextResponse.json({ error: `Bio must be ${BIO_MAX_LENGTH} characters or fewer.` }, { status: 400 });
  }

  const trimmedLocation = location.trim();
  if (trimmedLocation.length > LOCATION_MAX_LENGTH) {
    return NextResponse.json({ error: `Location must be ${LOCATION_MAX_LENGTH} characters or fewer.` }, { status: 400 });
  }

  const trimmedWebsiteUrl = websiteUrl.trim();
  if (trimmedWebsiteUrl && !isValidProfileUrl(trimmedWebsiteUrl)) {
    return NextResponse.json({ error: "Website must be a valid http(s) URL." }, { status: 400 });
  }

  // Empty clears each field back to unset, rather than storing an empty
  // string — matches the profile page's "not set" placeholder logic.
  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      bio: trimmedBio || null,
      location: trimmedLocation || null,
      websiteUrl: trimmedWebsiteUrl || null,
    },
  });
  return NextResponse.json({ bio: user.bio, location: user.location, websiteUrl: user.websiteUrl });
}
