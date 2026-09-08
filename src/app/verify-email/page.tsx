import { headers } from "next/headers";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { ResendVerificationForm } from "@/components/resend-verification-form";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const nonce = (await headers()).get("x-nonce");

  if (!token) {
    return (
      <Message title="Invalid link">
        <p>This verification link is missing its token. Check that you copied the full URL from your email.</p>
      </Message>
    );
  }

  const record = await prisma.verificationToken.findUnique({ where: { token } });

  if (!record || record.expires < new Date()) {
    // record.identifier (the email this link was for) is still available
    // here, right up until the delete below — worth prefilling even though
    // it's already gone from the client's perspective once this renders.
    const expiredEmail = record?.identifier;
    if (record) {
      await prisma.verificationToken.delete({ where: { token } }).catch(() => {});
    }
    return (
      <Message title="Link expired">
        <p>This verification link is invalid or has expired. Request a new one below.</p>
        <ResendVerificationForm email={expiredEmail} nonce={nonce} />
      </Message>
    );
  }

  const user = await prisma.user.findUnique({ where: { email: record.identifier } });
  if (!user) {
    return (
      <Message title="Account not found">
        <p>We couldn&rsquo;t find an account for this verification link.</p>
      </Message>
    );
  }

  await prisma.user.update({ where: { id: user.id }, data: { emailVerified: new Date() } });
  await prisma.verificationToken.delete({ where: { token } });

  return (
    <Message title="Email verified">
      <p>
        Your email is verified.{" "}
        <Link href="/login" className="text-red-500 hover:underline">
          Sign in
        </Link>{" "}
        to rate movies, manage your lists, and join discussions.
      </p>
    </Message>
  );
}

function Message({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="mb-3 text-2xl font-bold text-white">{title}</h1>
      <div className="mb-6 flex flex-col items-center gap-3 text-neutral-400">{children}</div>
      <Link href="/" className="text-red-500 hover:underline">
        Back to the homepage
      </Link>
    </div>
  );
}
