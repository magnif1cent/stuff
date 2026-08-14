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
        <nav className="order-2 flex w-full flex-wrap items-center justify-start gap-x-3 gap-y-2 sm:order-3 sm:ml-auto sm:w-auto sm:flex-nowrap sm:gap-x-4">
          <Link href="/search" className="text-sm whitespace-nowrap text-neutral-300 hover:text-white">
            Movies
          </Link>
          <Link href="/search/fight-scenes" className="text-sm whitespace-nowrap text-neutral-300 hover:text-white">
            Fights
          </Link>
          <Link href="/lists" className="text-sm whitespace-nowrap text-neutral-300 hover:text-white">
            Lists
          </Link>
          <Link href="/movies/submit" className="text-sm whitespace-nowrap text-neutral-300 hover:text-white">
            + Add Movie
          </Link>
          {session?.user ? (
            <>
              {(session.user.role === "ADMIN" || session.user.role === "REVIEWER") && (
                <Link href="/admin" className="text-sm whitespace-nowrap text-neutral-300 hover:text-white">
                  Admin
                </Link>
              )}
              <Link
                href={`/members/${session.user.username}`}
                className="text-sm whitespace-nowrap text-neutral-500 hover:text-white"
              >
                {session.user.username}
              </Link>
              <SignOutButton />
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm whitespace-nowrap text-neutral-300 hover:text-white">
                Sign in
              </Link>
              <Link
                href="/register"
                className="rounded-md bg-red-700 px-3 py-1.5 text-sm font-medium whitespace-nowrap text-white hover:bg-red-600"
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
