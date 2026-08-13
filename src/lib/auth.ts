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
      } else if (token.id && (!token.role || !token.username)) {
        const dbUser = await prisma.user.findUnique({ where: { id: token.id as string } });
        token.role = dbUser?.role ?? "USER";
        token.username = dbUser?.username;
      }
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
