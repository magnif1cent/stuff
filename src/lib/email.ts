// Pluggable email sender. With no RESEND_API_KEY configured (default for local
// dev, and for this environment where no email provider account exists), this
// logs the link server-side instead of sending anything — the verification
// flow itself is fully testable without a real inbox. Swap in a real provider
// by filling in the fetch call below once RESEND_API_KEY is set.

export async function sendVerificationEmail(email: string, verifyUrl: string) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.log(`[email:dev] Verification link for ${email}: ${verifyUrl}`);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "Kung Fu Movie DB <onboarding@resend.dev>",
      to: email,
      subject: "Verify your email — Kung Fu Movie DB",
      html: `<p>Click <a href="${verifyUrl}">this link</a> to verify your email address. It expires in 24 hours.</p>`,
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to send verification email: ${res.status} ${await res.text()}`);
  }
}
