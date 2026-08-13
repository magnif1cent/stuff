import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { generateUniqueUsername } from "@/lib/username";
import { checkRateLimit, loginLimiter } from "@/lib/rate-limit";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      async profile(profile) {
        const email = profile.email.toLowerCase();
        // Google sign-up has no form step of ours to ask for a username
        // directly, so seed one from the email's local part; the member can
        // rename it later once profile editing exists.
        const username = await generateUniqueUsername(email.split("@")[0]);
        return {
          id: profile.sub,
          username,
          email,
          image: profile.picture,
          role: "USER",
          // Google already verified this address — no reason to make the
          // user verify it again through our own flow.
          emailVerified: profile.email_verified ? new Date() : null,
        };
      },
    }),
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") {
          return null;
        }

        // Same normalization as registration — lookups must match on case.
        const normalizedEmail = email.trim().toLowerCase();

        // Keyed by the target email, not IP (easily rotated, and not
        // reliably available here) — this is a brute-force defense against
        // one account, not a general request throttle. A rate-limited
        // attempt just fails like a wrong password: no separate error path,
        // so it doesn't leak rate-limit state to the client either.
        const rateLimit = await checkRateLimit(loginLimiter, normalizedEmail);
        if (!rateLimit.success) {
          return null;
        }

        const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
        if (!user?.passwordHash) {
          return null;
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          return null;
        }

        return {
          id: user.id,
          username: user.username,
          email: user.email,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role ?? "USER";
        token.username = user.username;
        // Baseline for the invalidation check below — a session is only
        // valid as long as the account's password hasn't changed since it
        // was issued. One extra query at sign-in is negligible next to the
        // bcrypt hashing sign-in already does. 0 (not null) is the "never
        // explicitly changed" sentinel — using the same sentinel on both
        // sides of the comparison below means an account's very first
        // password change still flips this from "unset" to a real
        // timestamp and correctly invalidates sessions issued before it;
        // null on both sides would make that first change a no-op instead.
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { passwordChangedAt: true },
        });
        token.passwordChangedAt = dbUser?.passwordChangedAt?.getTime() ?? 0;
        return token;
      }

      if (!token.id) return token;

      // Auth.js re-invokes this callback on every session check for
      // JWT-strategy sessions, not just at sign-in — so this DB hit happens
      // on every request. That's a deliberate cost: without it, a password
      // reset would change the password but leave every other already-open
      // session (a stolen cookie, a forgotten logged-in device) working
      // until it naturally expires, defeating forgot-password's entire
      // point of being able to lock an attacker out.
      const dbUser = await prisma.user.findUnique({
        where: { id: token.id as string },
        select: { role: true, username: true, passwordChangedAt: true },
      });
      if (!dbUser) return null; // account deleted since this session was issued

      // A token with no `passwordChangedAt` at all (undefined, not 0) was
      // issued before this check existed — this invalidates it unconditionally,
      // a one-time global sign-out the moment this ships. After that every
      // session tracks correctly from its own sign-in baseline, including an
      // account's very first password change post-deploy.
      const dbChangedAt = dbUser.passwordChangedAt?.getTime() ?? 0;
      if (dbChangedAt !== token.passwordChangedAt) {
        return null;
      }

      token.role = dbUser.role ?? "USER";
      token.username = dbUser.username;
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as string) ?? "USER";
        session.user.username = token.username as string;
      }
      return session;
    },
  },
});
