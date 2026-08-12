"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="text-sm whitespace-nowrap text-neutral-300 hover:text-white"
    >
      Sign out
    </button>
  );
}
