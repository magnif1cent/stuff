import type { NextConfig } from "next";

// Static, route-independent headers. The Content-Security-Policy is
// per-request (needs a nonce), so it's set in proxy.ts instead — these
// don't need that and apply broadly, including to API routes, for
// defense in depth even though CSP itself only matters for HTML pages.
const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  images: {
    // Matches every fixed-pixel `sizes` value actually used in the app
    // (movie-card, actor/leaderboard rows, feeds, search). Next's default
    // imageSizes list doesn't line up with these, so it was generating
    // extra width variants nobody needed — each one counts against
    // Vercel's Image Optimization transformation quota.
    imageSizes: [28, 32, 36, 40, 56, 64, 96, 112, 128, 160, 192, 224],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        pathname: "/t/p/**",
      },
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
    ];
  },
  // "Fight Scenes" was renamed to "Fights" everywhere it's a page URL or
  // label (see DECISIONS.md) -- these keep any bookmarked or search-indexed
  // links to the old paths working instead of 404ing.
  async redirects() {
    return [
      { source: "/movies/:id/fight-scenes", destination: "/movies/:id/fights", permanent: true },
      {
        source: "/movies/:id/fight-scenes/:fightSceneId",
        destination: "/movies/:id/fights/:fightSceneId",
        permanent: true,
      },
      { source: "/search/fight-scenes", destination: "/search/fights", permanent: true },
    ];
  },
};

export default nextConfig;
