import Link from "next/link";
import { auth } from "@/lib/auth";
import { isEmailVerified } from "@/lib/verification";
import { Logo } from "@/components/logo";
import { SearchBar } from "@/components/search-bar";
import { SignOutButton } from "@/components/sign-out-button";
import { VerifyEmailBanner } from "@/components/verify-email-banner";

export async function Navbar() {
  const session = await auth();
  // Checked fresh against the DB rather than trusting a JWT claim, so this
  // reflects the truth immediately after someone clicks their verification
  // link — a JWT-cached flag would stay stale until their next sign-in.
  const needsVerification = !!session?.user && !(await isEmailVerified(session.user.id));

  return (
    <header className="sticky top-0 z-20 border-b border-neutral-800 bg-neutral-950/95 backdrop-blur">
      {needsVerification && <VerifyEmailBanner />}
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3">
        <Logo />
        <div className="order-3 w-full sm:order-2 sm:w-auto sm:flex-1">
          <SearchBar />
        </div>
        <nav className="order-2 ml-auto flex items-center gap-4 sm:order-3">
          <Link href="/search" className="text-sm text-neutral-300 hover:text-white">
            Browse
          </Link>
          <Link href="/search/fight-scenes" className="text-sm text-neutral-300 hover:text-white">
            Fight Scenes
          </Link>
          <Link href="/leaderboard" className="text-sm text-neutral-300 hover:text-white">
            Leaderboard
          </Link>
          {session?.user ? (
            <>
              {session.user.role === "ADMIN" && (
                <Link href="/admin" className="text-sm text-neutral-300 hover:text-white">
                  Admin
                </Link>
              )}
              <Link href={`/members/${session.user.username}`} className="text-sm text-neutral-500 hover:text-white">
                {session.user.username}
              </Link>
              <SignOutButton />
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm text-neutral-300 hover:text-white">
                Sign in
              </Link>
              <Link
                href="/register"
                className="rounded-md bg-red-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-600"
              >
                Join
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
