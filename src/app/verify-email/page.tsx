import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <Message title="Invalid link">
        This verification link is missing its token. Check that you copied the full URL from your email.
      </Message>
    );
  }

  const record = await prisma.verificationToken.findUnique({ where: { token } });

  if (!record || record.expires < new Date()) {
    if (record) {
      await prisma.verificationToken.delete({ where: { token } }).catch(() => {});
    }
    return (
      <Message title="Link expired">
        This verification link is invalid or has expired. Sign in and use the &ldquo;Resend email&rdquo;
        button to get a new one.
      </Message>
    );
  }

  const user = await prisma.user.findUnique({ where: { email: record.identifier } });
  if (!user) {
    return (
      <Message title="Account not found">
        We couldn&rsquo;t find an account for this verification link.
      </Message>
    );
  }

  await prisma.user.update({ where: { id: user.id }, data: { emailVerified: new Date() } });
  await prisma.verificationToken.delete({ where: { token } });

  return (
    <Message title="Email verified">
      Your email is verified. You can now rate movies, manage your lists, and join discussions.
    </Message>
  );
}

function Message({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="mb-3 text-2xl font-bold text-white">{title}</h1>
      <p className="mb-6 text-neutral-400">{children}</p>
      <Link href="/" className="text-red-500 hover:underline">
        Back to the homepage
      </Link>
    </div>
  );
}
