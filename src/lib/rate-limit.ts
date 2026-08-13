import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Optional, same pattern as RESEND_API_KEY/BLOB_READ_WRITE_TOKEN elsewhere in
// this app: without it configured (local dev, CI, or simply not set up yet),
// every limiter below is null and checkRateLimit() no-ops rather than
// blocking everything. Real, correct rate limiting needs a store shared
// across serverless instances — an in-memory counter would reset on every
// cold start and not be shared across instances in the first place.
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

function makeLimiter(prefix: string, limit: number, window: `${number} ${"s" | "m" | "h"}`) {
  return redis
    ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(limit, window), prefix: `ratelimit:${prefix}` })
    : null;
}

// Credential-attack surfaces: tighter limits, keyed by identity (email) since
// that's what an attacker is actually targeting, not by IP (easily rotated,
// and NextAuth's authorize() callback is the only place IP isn't reliably
// available anyway).
export const loginLimiter = makeLimiter("login", 5, "5 m");
export const registerLimiter = makeLimiter("register", 5, "10 m");
export const resendVerificationLimiter = makeLimiter("resend-verification", 3, "1 h");
// Keyed by IP, not email — unlike the limiters above, this request is
// unauthenticated and must not reveal whether the email has an account, so
// it can't be keyed by identity without leaking exactly that.
export const forgotPasswordLimiter = makeLimiter("forgot-password", 5, "10 m");

// Content-creation surfaces: looser limits, keyed by user id — spam/abuse
// deterrent rather than a credential-attack defense, so the threshold is
// about "a script gone wrong" rather than "an attacker probing accounts."
export const discussionPostLimiter = makeLimiter("discussion-post", 20, "10 m");
export const fightSceneSubmitLimiter = makeLimiter("fight-scene-submit", 10, "10 m");
export const movieSubmitLimiter = makeLimiter("movie-submit", 10, "10 m");
export const listCreateLimiter = makeLimiter("list-create", 10, "10 m");

export interface RateLimitResult {
  success: boolean;
  retryAfterSeconds?: number;
}

export async function checkRateLimit(limiter: Ratelimit | null, identifier: string): Promise<RateLimitResult> {
  if (!limiter) return { success: true };
  const result = await limiter.limit(identifier);
  if (result.success) return { success: true };
  return { success: false, retryAfterSeconds: Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)) };
}

// x-forwarded-for's first entry is the original client — Vercel (and most
// proxies) append hops after it, so later entries aren't the requester.
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return "unknown";
}
