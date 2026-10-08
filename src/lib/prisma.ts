import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { attachDatabasePool } from "@vercel/functions";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  // pg closes a connection once it's been idle for idleTimeoutMillis (10s by
  // default), but that timer only runs while the function instance is. On
  // Vercel, an instance is suspended between requests, so the timer never
  // fires and idle connections stay open to Neon until the instance is
  // reclaimed — keeping the compute from scaling to zero (see DECISIONS.md,
  // "Neon compute kept awake around the clock"). attachDatabasePool keeps
  // the instance alive just long enough for the pool to close them. It's a
  // no-op outside Vercel (local dev, scripts, CI).
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  attachDatabasePool(pool);
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
