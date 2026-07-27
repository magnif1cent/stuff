import Link from "next/link";
import { auth } from "@/lib/auth";
import { SearchBar } from "@/components/search-bar";
import { SignOutButton } from "@/components/sign-out-button";

export async function Navbar() {
  const session = await auth();

  return (
    <header className="sticky top-0 z-20 border-b border-neutral-800 bg-neutral-950/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3">
        <Link href="/" className="whitespace-nowrap text-lg font-bold tracking-tight text-red-600">
          師父<span className="text-white">Kung Fu DB</span>
        </Link>
        <div className="order-3 w-full sm:order-2 sm:w-auto sm:flex-1">
          <SearchBar />
        </div>
        <nav className="order-2 ml-auto flex items-center gap-4 sm:order-3">
          {session?.user ? (
            <>
              <Link href="/my-lists" className="text-sm text-neutral-300 hover:text-white">
                My Lists
              </Link>
              {session.user.role === "ADMIN" && (
                <Link href="/admin/import" className="text-sm text-neutral-300 hover:text-white">
                  Admin
                </Link>
              )}
              <span className="text-sm text-neutral-500">{session.user.name ?? session.user.email}</span>
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
