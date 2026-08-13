import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      username: string;
    } & DefaultSession["user"];
  }

  interface User {
    role?: string;
    username?: string;
    emailVerified?: Date | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    username?: string;
    // Epoch ms of the account's passwordChangedAt at the time this session
    // was issued, or 0 if the account had never explicitly changed it yet.
    // Compared against the live DB value on every request to invalidate
    // sessions predating a later password change/reset — see auth.ts's jwt
    // callback. A token with this field entirely absent (undefined, from
    // before this check existed) is always treated as stale.
    passwordChangedAt?: number;
  }
}
