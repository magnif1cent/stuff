import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isEmailVerified } from "@/lib/verification";
import { MAX_FIGHT_SCENE_TAG_NAME_LENGTH } from "@/lib/fight-scenes";
import { checkRateLimit, fightSceneTagCreateLimiter } from "@/lib/rate-limit";

// Member-facing tag creation -- separate from /api/admin/fight-scene-tags,
// which is the admin management surface (list with usage counts, rename,
// delete). Tags aren't treated as data-hygiene-critical: a member's tag
// goes live immediately, no approval queue, with admin delete as the
// fallback if one turns out to be junk or a near-duplicate that slipped
// past the case-insensitive check below.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in to create a tag." }, { status: 401 });
  }
  if (!(await isEmailVerified(session.user.id))) {
    return NextResponse.json({ error: "Verify your email before creating a tag." }, { status: 403 });
  }

  const rateLimit = await checkRateLimit(fightSceneTagCreateLimiter, session.user.id);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "You're creating tags too quickly. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  const { name } = await request.json();
  if (typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "name is required." }, { status: 400 });
  }
  const trimmedName = name.trim();
  if (trimmedName.length > MAX_FIGHT_SCENE_TAG_NAME_LENGTH) {
    return NextResponse.json(
      { error: `name must be ${MAX_FIGHT_SCENE_TAG_NAME_LENGTH} characters or fewer.` },
      { status: 400 },
    );
  }

  // Case-insensitive: reuse an existing tag ("Weapon Duel"/"weapon duel")
  // instead of creating a near-duplicate. Unlike the admin create endpoint,
  // which rejects a duplicate outright since an admin is explicitly
  // curating the vocabulary, a member just wants their scene tagged --
  // silently resolving to the existing tag is the better outcome here.
  const existing = await prisma.fightSceneTag.findFirst({
    where: { name: { equals: trimmedName, mode: "insensitive" } },
  });
  if (existing) {
    return NextResponse.json({ tag: existing });
  }

  const tag = await prisma.fightSceneTag.create({ data: { name: trimmedName } });
  return NextResponse.json({ tag });
}
