import Link from "next/link";
import { auth } from "@/lib/auth";
import { isEmailVerified } from "@/lib/verification";
import { Logo } from "@/components/logo";
import { SearchBar } from "@/components/search-bar";
import { NavDropdown } from "@/components/nav-dropdown";
import { NavLink } from "@/components/nav-link";
import { AccountNavMenu } from "@/components/account-nav-menu";
import { VerifyEmailBanner } from "@/components/verify-email-banner";
import { MobileNavToggle } from "@/components/mobile-nav-toggle";

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
        <MobileNavToggle>
          <div className="order-3 w-full sm:order-2 sm:w-auto sm:flex-1">
            <SearchBar />
          </div>
          <nav className="order-2 flex w-full flex-wrap items-center justify-start gap-x-3 gap-y-2 sm:order-3 sm:ml-auto sm:w-auto sm:flex-nowrap sm:gap-x-4">
            <NavDropdown
              label="Movies"
              href="/search"
              ariaLabel="More ways to browse movies"
              isActive={(p) => p === "/search" || p === "/timeline" || p.startsWith("/timeline/")}
              items={[
                {
                  href: "/timeline",
                  label: "Timeline",
                  isActive: (p) => p === "/timeline" || p.startsWith("/timeline/"),
                },
              ]}
            />
            <NavLink href="/search/fights">Fights</NavLink>
            <NavDropdown
              label="Lists"
              href="/lists"
              ariaLabel="More list options"
              isActive={(p) => p === "/lists" || p.startsWith("/lists/") || p === "/leaderboard"}
              items={[{ href: "/leaderboard", label: "Leaderboard" }]}
            />
            <Link
              href="/movies/submit"
              className="rounded-md border border-neutral-700 px-3 py-1.5 text-sm font-medium whitespace-nowrap text-neutral-300 hover:border-red-600 hover:text-white"
            >
              + Add Movie
            </Link>
            {session?.user?.role === "ADMIN" || session?.user?.role === "REVIEWER" ? (
              <Link href="/admin" className="text-sm whitespace-nowrap text-neutral-300 hover:text-white">
                Admin
              </Link>
            ) : null}
            {session?.user ? (
              <AccountNavMenu username={session.user.username} />
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
        </MobileNavToggle>
      </div>
    </header>
  );
}
