import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createVerificationToken, buildVerificationUrl, isEmailVerified } from "@/lib/verification";
import { sendVerificationEmail } from "@/lib/email";
import { checkRateLimit, resendVerificationLimiter } from "@/lib/rate-limit";

export async function POST() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  if (await isEmailVerified(session.user.id)) {
    return NextResponse.json({ error: "Your email is already verified." }, { status: 400 });
  }

  const rateLimit = await checkRateLimit(resendVerificationLimiter, session.user.id);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "Too many resend attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  const token = await createVerificationToken(session.user.email);
  await sendVerificationEmail(session.user.email, buildVerificationUrl(token));

  return NextResponse.json({ ok: true });
}
