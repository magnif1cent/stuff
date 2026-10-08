import type { MetadataRoute } from "next";

// Every page on this site renders per request (the nonce CSP in proxy.ts and
// the navbar's auth() both force it), so every crawler hit is a round of
// database queries — and a crawler walking a page every few minutes is
// enough to keep Neon's compute from ever scaling to zero. This keeps
// well-behaved crawlers on the canonical content pages and out of the URL
// spaces that are effectively infinite (search/filter/sort combinations) or
// that have nothing to index (API, admin, account, auth flows). Pagination
// (?page=) stays crawlable so list pages can still be discovered in full.
// Only helps with crawlers that honor robots.txt; see DECISIONS.md.
//
// No `sitemap` entry, deliberately and for now: advertising /sitemap.xml
// here handed every crawler a to-do list of every movie/fight/actor page,
// each still a per-request database hit, and Neon stopped scaling to zero
// the day it shipped. /sitemap.xml itself still exists (and can be submitted
// directly in Google Search Console). Caching page data wouldn't make it
// safe to re-add: a sitemap crawl requests each page once, so every hit is
// a cache miss. Re-add it when the database plan can absorb the crawl (a
// paid Neon plan) — see DECISIONS.md, "Sitemap removed from robots.txt
// until page data is cached".
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/admin",
        "/search",
        "/my-lists",
        "/login",
        "/register",
        "/forgot-password",
        "/reset-password",
        "/verify-email",
        // Sort/filter/query variants of otherwise-crawlable pages (e.g.
        // /movies/[id]/fights?sort=…&tag=…, /lists?q=…) — each combination
        // is a distinct URL to a crawler but the same content.
        "/*?*sort=",
        "/*?*tag=",
        "/*?*verified=",
        "/*?*set=",
        "/*?*q=",
      ],
    },
  };
}
