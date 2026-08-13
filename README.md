# Kung Fu Movie Database

An IMDB-style website for kung fu and martial arts films, built for martial arts movie enthusiasts. Movie data is sourced from [TMDB](https://www.themoviedb.org/).

## Features

- Landing page with a weekly-rotating "trending" carousel (top 5 most-active movies over the last 7 days) and a recently-added grid — each slide plays a short preview of the movie's best verified fight scene when one exists, falling back to the static backdrop otherwise (see [Weekly Trending Carousel](#weekly-trending-carousel) below)
- Search by movie title, actor, or director name, with filters (genre, director, actor, country, release-year range, minimum community rating, minimum editor rating), sorting (relevance, highest rated, newest, oldest), pagination, and a typo-tolerant "did you mean" fallback when nothing matches exactly — plus a dedicated fight-scene search at `/search/fight-scenes` (filter by tag, actor, member/editor rating) — see [Search](#search) below
- Movie pages with cast, synopsis, a community rating, a separate admin-only "Editors' Score", an admin-authored editorial review, and a per-movie discussion thread (with spoiler tags, edit/delete on your own posts, and admin moderation)
- **Fight Scenes**: members tag specific fight scenes within a movie — YouTube clip (with an optional start timestamp), the actors involved (picked from that movie's cast), and category tags (e.g. "Weapon Duel", "One vs. Many") — with their own member rating, a separate admin rating, admin verification, and a shareable permalink page (see [Fight Scenes](#fight-scenes) below)
- Actor pages (`/actors/[personId]`) showing an actor's filmography and every fight scene they're tagged in, linked from a movie's cast list and a scene's "Featuring" line (see [Actor Pages](#actor-pages) below)
- Member accounts via email/password (with email verification and self-service password recovery) or Google sign-in, identified publicly by a chosen username rather than their email or real name (see [Usernames](#usernames) and [Password Recovery](#password-recovery) below)
- Member capabilities: rate movies and fight scenes, maintain a Favorites list and a Watchlist for movies (fight scenes get a Favorite only — see below), create their own public named lists on a profile page at `/members/[username]` and save both movies and fight scenes to them (see [Member Lists & Profiles](#member-lists--profiles) below), post/reply in movie discussions, submit fight scenes, and submit a movie missing from the catalog for admin review (see [Member Movie Submissions](#member-movie-submissions) below)
- A unified `/admin` dashboard (Movies management incl. pending-submission review and permanent deletion, TMDB import incl. title search, keyword search, and bulk CSV upload, Fight Scene Tags, News & Updates, Account settings), shared by two roles &mdash; `ADMIN` (everything) and a narrower `REVIEWER` (movie-submission review, fight-scene-tag management, fight-scene verification) &mdash; plus admin actions that stay inline on regular pages (Editors' Score, editorial reviews, poster overrides, fight scene verification) &mdash; see [Admin Area & Roles](#admin-area--roles) below
- Social sharing (native share sheet on mobile, copy-link/X/Facebook/Reddit fallback on desktop) on movie and fight scene pages
- A public `/lists` page for browsing every member's public custom lists (sorted by newest-updated or most-liked, paginated), plus a `/leaderboard` page ranking the Most-Liked Lists (members can like each other's public custom lists) and Top Curators (members with the most movies across their own lists) — see [Member Lists & Profiles](#member-lists--profiles) below
- Admin-published News & Updates posts: the latest one shown as a teaser banner on the homepage, with a full paginated archive at `/news` — see [News & Updates](#news--updates) below
- Security headers (CSP, HSTS, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`) on every response, plus rate limiting and CAPTCHA on login, registration, forgot-password, and content-creation endpoints — see [Security](#security) below

## Tech Stack

- [Next.js](https://nextjs.org/) (App Router) + TypeScript + Tailwind CSS
- [Prisma ORM](https://www.prisma.io/) 7 + PostgreSQL (via the `@prisma/adapter-pg` driver adapter)
- [Auth.js (NextAuth) v5](https://authjs.dev/) — Credentials (email/password) + Google OAuth
- [TMDB API](https://developer.themoviedb.org/docs) for movie/person data
- [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) for admin-uploaded poster overrides
- [Vercel Web Analytics](https://vercel.com/docs/analytics) for page-view tracking (see [Web Analytics](#web-analytics) below)
- [Upstash Redis](https://upstash.com) for rate limiting (see [Security](#security) below)
- [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/) for CAPTCHA (see [Security](#security) below)

## Getting Set Up

### 1. Install dependencies

```bash
npm install
```

### 2. Get a PostgreSQL database

Pick one:

- **Local Postgres** — install PostgreSQL locally, then create a database:
  ```bash
  createdb kungfu_dev
  ```
- **Hosted (recommended for deploying)** — create a free database on [Neon](https://neon.tech), [Supabase](https://supabase.com), or [Vercel Postgres](https://vercel.com/storage/postgres), and copy its connection string.

### 3. Get a TMDB API key

1. Create a free account at [themoviedb.org](https://www.themoviedb.org/signup).
2. Go to **Settings → API** and request an API key (the "Developer" key is free).
3. Copy the "API Key (v3 auth)" value.

### 4. Set up Google OAuth (optional, for "Sign in with Google")

1. Go to the [Google Cloud Console credentials page](https://console.cloud.google.com/apis/credentials).
2. Create an OAuth 2.0 Client ID (Application type: **Web application**).
3. Add an authorized redirect URI:
   - Local dev: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://<your-domain>/api/auth/callback/google`
4. Copy the generated Client ID and Client Secret.

### 5. Configure environment variables

```bash
cp .env.example .env
```

Fill in `DATABASE_URL`, `TMDB_API_KEY`, `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`, and generate an `AUTH_SECRET`. `RESEND_API_KEY`/`EMAIL_FROM` are optional — see [Email Verification](#email-verification) below. `BLOB_READ_WRITE_TOKEN` is optional too — see [Admin Poster Overrides](#admin-poster-overrides). `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` and `NEXT_PUBLIC_TURNSTILE_SITE_KEY`/`TURNSTILE_SECRET_KEY` are optional too — see [Security](#security).

```bash
npx auth secret
```

### 6. Apply the database schema and seed sample data

```bash
npx prisma migrate dev
npx prisma db seed
```

One of the migrations runs `CREATE EXTENSION IF NOT EXISTS pg_trgm` (used for the typo-tolerant search fallback) and needs a role with permission to create extensions — true for a local Postgres superuser and for Neon, but some hosted providers require enabling extensions through their dashboard instead of letting a migration do it.

The seed script creates a few placeholder movies (clearly not real TMDB imports) so the site is browsable immediately, plus two pre-verified test accounts:

- `admin@example.com` / `admin1234` (username `admin`, role: ADMIN)
- `reviewer@example.com` / `reviewer1234` (username `reviewer`, role: REVIEWER)
- `member@example.com` / `member1234` (username `member`, role: USER)

### 7. Run the app

```bash
npm run dev
```

Visit `http://localhost:3000`. Sign in as the admin account and use `/admin/import` to search TMDB and pull in real kung fu films (there's no single "kung fu" genre on TMDB, so curation is admin-driven by design — see [TMDB Import](#tmdb-import) below for both ways to search).

## Usernames

Members are identified publicly by a username, not their email or real name — it's what shows on discussion posts, fight scenes, and editorial reviews. Usernames are unique, 3-20 characters, lowercase letters/numbers/underscores only.

- **Credentials sign-up** requires picking a username on the registration form; taken or invalid usernames are rejected with a specific error.
- **Google sign-up** has no form step of ours to ask for one, so a starting username is auto-generated from the email's local part (sanitized to the allowed charset, with a numeric suffix if it's taken). There's no self-service rename yet — a reasonable next step once profile editing exists.
- Accounts created before this feature (on a live deployment with existing data) are backfilled the same way, by the `20260804190000_add_username` migration — no manual action needed beyond running the migration.

## Email Verification

Registering with email/password creates the account immediately and sends a verification link — you can sign in and browse right away, but rating movies, managing lists, and posting in discussions require a verified email (a banner with a "Resend email" button appears until you verify). Google sign-ins are auto-verified, since Google already confirmed that address.

Without `RESEND_API_KEY` configured, the verification link is logged to the server console instead of emailed (`[email:dev] Verification link for ...`) — grab it from there for local testing. To send real emails:

1. Create a free account at [resend.com](https://resend.com) and get an API key.
2. Set `RESEND_API_KEY` (and `EMAIL_FROM`, once you've verified a sending domain in Resend — until then their shared `onboarding@resend.dev` sender only delivers to your own Resend account email).
3. To use a different provider, replace the `fetch` call in `src/lib/email.ts`.

## Password Recovery

A "Forgot password?" link on the sign-in page (`/forgot-password`) emails a reset link to accounts that signed up with email/password — Google sign-ins have no password to reset, so they get no link (see [Security](#security) below for why). The link expires in 1 hour and is single-use; requesting a new one invalidates any earlier outstanding link for that account. Uses the same `RESEND_API_KEY` setup as email verification above — without it, the reset link is logged to the server console instead (`[email:dev] Password reset link for ...`).

## Discussion & Moderation

- Any signed-in member can post and reply (one level of replies) on a movie's discussion thread. Discussion is paginated (20 posts/page, "Load more") and content is capped at 5,000 characters.
- Wrap text in `[spoiler]...[/spoiler]` to hide it behind a "click to reveal" toggle — useful for plot twists/endings discussed on the movie's own page. Note this is a client-side reveal (like most forum spoiler tags): the text is present in the page's data, just not shown until clicked, so it isn't a substitute for redacting genuinely secret data.
- Authors can edit or delete their own posts; admins can delete anyone's post. Deletion is a soft-delete — the row and any replies underneath it are kept (so a thread doesn't fall apart when one comment in it is removed), but the content is blanked and the post renders as `[deleted]`.

## Search

Two dedicated search pages, both with a vertical sidebar of filters, pagination, and sort options — split apart because a fight-scene result is the scene itself, not "a movie that happens to contain one."

- **`/search`** (movies) — filters: genre, director (autocomplete), actor (autocomplete), country, release-year range, minimum community rating, minimum editor rating. Sort by relevance, highest rated, newest, or oldest. A typo-tolerant "did you mean" fallback (via Postgres `pg_trgm`, see [Getting Set Up](#getting-set-up)) kicks in when nothing matches exactly.
- **`/search/fight-scenes`** — filters: category tag (multi-select, matches any selected), actor (autocomplete, scoped to people actually tagged in a fight scene — not just anyone in a movie's cast), minimum member rating, minimum editor rating. Sort by newest, highest member rated, highest editor rated, or most favorited.
- The navbar's search box submits to `/search` in "browse" mode (no filters) when submitted empty, rather than doing nothing — both pages are also reachable directly via the "Browse" and "Fight Scenes" nav links.
- **Quick links into filtered search**: a movie's genre badges and a fight scene's category-tag badges are clickable, deep-linking straight into the matching filtered search (`/search?genre=`, `/search/fight-scenes?tag=`) instead of requiring the filter to be set by hand.

## TMDB Import

`/admin/import` has three ways to find and import movies — search-and-browse (title or keyword) for discovering films, or CSV upload when you already know exactly what you want:

- **By title** — search TMDB by movie title and import one result at a time. Good for a specific film you already know by name.
- **By keyword** — search for one or more TMDB keywords (e.g. "kung fu", "martial arts"), optionally narrow by production country (a curated dropdown of common origins like Hong Kong, China, Taiwan — TMDB's `with_origin_country` accepts any ISO 3166-1 code, the dropdown just picks common ones), then browse matching movies (20 per page, "Load more" to page further) with poster, title, release year, production country, and top-billed cast shown for each, so you can judge relevance before importing. Selecting multiple keywords matches movies tagged with *any* of them (TMDB's `with_keywords` OR logic), not all of them; the country filter ANDs against that. Results are pre-checked by default — uncheck the ones that don't belong rather than checking the ones you want — and movies already in your catalog are shown but excluded from selection. "Import selected" imports the checked movies (a few at a time, not all at once) and reports how many succeeded.
  - TMDB's `/discover/movie` endpoint (used for keyword search) caps at page 500 (10,000 results) regardless of how many total matches it reports; a search with more matches than that needs narrowing (e.g. an additional keyword or a country filter) to reach everything.
  - Country and cast require an extra per-movie detail lookup beyond what the base keyword search returns, so each page of 20 keyword results costs more TMDB requests than a title search does — still well within TMDB's rate limits for realistic result counts, just not instant.
  - `with_origin_country` isn't in TMDB's official (outdated) API docs, though it's confirmed working and referenced by TMDB's own support — worth knowing if it ever needs debugging.
- **Bulk CSV upload** — for when you already have a list of titles in hand rather than needing to discover them; see [Admin Area & Roles](#admin-area--roles) below for the format.

## Member Lists & Profiles

Every member has a profile page at `/members/[username]`. Viewing your own shows Favorites, Watchlist, Favorite Fight Scenes, and your custom lists with full management controls (create/rename/delete); viewing someone else's shows only their public custom lists, read-only. `/my-lists` still works as a link — it just redirects to your own profile.

Beyond the built-in Favorites and Watchlist, members can create any number of their own named lists (e.g. "Best One-vs-Many Fights") from the "+ Add to list" control on a movie page, and manage them from their own profile. Lists hold fight scenes as well as movies — every fight scene card, wherever it appears (a movie page, its own permalink, fight scene search results, or another member's list), has its own bookmark-icon "save to list" control alongside the share icon.

- **Fight scenes get a one-tap Favorite, same red heart icon movies use, but no Watchlist** — a scene is a short clip you can watch right where it's linked, not something to queue up for later the way a full movie is. Every fight scene card has its own heart icon, independent of the movie it belongs to and independent of custom lists — you can favorite a scene without favoriting its movie, or vice versa.
- **Custom lists are public by design; Favorites/Watchlist are not.** Every custom list has its own shareable permalink at `/lists/[id]` (also reachable via its owner's profile) that anyone can view signed in or not, with no private option. Favorites and Watchlist (for both movies and fight scenes) stay exactly as private as they've always been: only the signed-in owner ever sees their own, on their own profile or anywhere else.
- A member can have at most 25 lists, with unique names per member; list names are capped at 60 characters.
- A pending (not yet admin-approved) movie can only be added to a list by its own submitter, and is excluded from the public list/profile view for everyone else, the same as it's excluded from every other public listing — see [Member Movie Submissions](#member-movie-submissions) below. A soft-deleted fight scene is excluded from a public list view the same way.
- **Liking lists and the leaderboard**: any signed-in, verified member other than the list's own owner can like a public custom list (one like per member per list; self-likes are blocked). `/leaderboard` ranks the Most-Liked Lists and, separately, Top Curators (members with the most total movies across their own lists). Both rankings recompute on every page load rather than being cached/scheduled.
- **Browsing lists**: `/lists` — reachable via the "Lists" nav link — lists every public custom list with at least one item, sorted by newest-updated or most-liked, 12 per page. Each card links to the list's permalink and shows its owner, item counts, and like count. It cross-links to `/leaderboard` and vice versa, so both surfaces are reachable from one another.

## Member Movie Submissions

`/movies/submit` lets a member search TMDB and submit a match directly — the same underlying TMDB import used by `/admin/import`, but scoped to one title at a time and requiring a verified email. Reachable two ways: a "+ Add Movie" link in the site nav (visible to everyone; signing in is only required to actually submit), or the "Can't find it? Add a movie" link shown on a zero-result search.

- **Submissions start `PENDING`**, not live: hidden from the homepage, search (including the navbar's), autocomplete director/actor filters, and the weekly-trending computation, and its own movie page 404s for everyone except the submitter and admins. This mirrors fight-scene verification's "member-created content, admin-gated visibility" pattern rather than admin imports' "goes live immediately" one, since anyone can trigger this path, not just a trusted admin.
- Submitting a `tmdbId` that's already in the catalog (approved or still pending) is rejected with a specific error rather than silently re-importing it — re-running the shared import logic on an existing row would otherwise reset an already-approved movie back to pending.
- Admins review submissions in a **Pending Submissions** section at the top of `/admin/movies` — Approve moves it to the catalog immediately; Reject permanently deletes it, same as deleting any other catalog entry.
- A successful submission shows a "View submission →" link straight to the new (still-pending) movie page, and the submitter's own profile lists everything they've got awaiting review in its own **Pending Submissions** section (visible only to them, same as Favorites/Watchlist), so there's somewhere to check status without waiting on an email.

## Fight Scenes

Below the cast list on every movie page, members can catalog individual fight scenes from that film:

- **Add a scene**: paste a YouTube URL (any watch/shorts/embed/`youtu.be`/live link, with an optional `t=`/`start=` timestamp used as the clip's initial start time), give it a title (the submitter can auto-fill from the video's public oEmbed title), tag which of the movie's own cast members are in it, and optionally attach up to 10 category tags. Requires a verified email.
- **Adjusting the start time**: only admins can set or change where a clip starts playing, via a "Start at" mm:ss control on each scene — no need to re-paste the YouTube link to retime it. A submitter's own edits (title, cast, tags, or even swapping the link) never touch the start time; it's admin-managed independently once the scene exists. Along with the editor rating/note, it's tucked behind an "Admin tools" toggle per card rather than always expanded, so an admin's own view of the movie page isn't cluttered with controls they're not currently using.
- **Round numbers** aren't stored — they're computed on read as the scene's position, by creation order, among that movie's non-deleted scenes. Delete scene 2 of 3 and the old scene 3 becomes Round 2 automatically.
- **Ratings**: members rate a scene 1–10 (one rating per member, editable); admins have a separate rating with an optional note, mirroring the movie-level Editors' Score.
- **Verification**: admins can mark a scene "Verified" as a quality signal. Editing a scene's content clears verification, since an admin's earlier check no longer vouches for what's there now.
- **Editing/deleting**: the submitter can edit or delete their own scene; admins can delete anyone's. Deletion is a soft-delete (like discussion posts) so ratings tied to a scene aren't orphaned.
- **Tags**: the tag list itself (e.g. "Weapon Duel", "One vs. Many") is admin-curated at `/admin/fight-scene-tags` — members choose from it but can't create new tags.
- **Permalinks**: each fight scene has its own page at `/movies/[id]/fight-scenes/[fightSceneId]` with dynamic Open Graph metadata (title, rating summary, YouTube thumbnail) for clean link previews when shared.
- **Saving to a list**: any member can save a fight scene to one of their own custom lists, or one-tap Favorite it — see [Member Lists & Profiles](#member-lists--profiles).

## Actor Pages

Every credited person has a page at `/actors/[personId]` showing their Filmography (movies in the catalog, excluding any still-pending submission) and every Fight Scene they're tagged in across the whole catalog, sorted by most favorited, reusing the same movie/fight-scene cards used everywhere else. Linked from a movie's Cast section and from the "Featuring" line on a fight scene card — there's no dedicated actor search yet, so browsing there is the only way in for now.

## Editorial Reviews

Admins can write a long-form review (up to 10,000 characters) for any movie, shown alongside the cast list. There's one review per movie — any admin can write or update it, and the page just tracks who last touched it.

The homepage's **Recent Reviews by Editors** section surfaces the 5 most recently written-or-edited reviews (an admin revising an older review counts, not just brand-new ones) as a two-column grid of compact cards — poster thumbnail, title, reviewer, date, and the review's full text clamped to 3 lines with a "Show more" toggle once it's long enough to need one, rather than a short teaser excerpt.

## Admin Recommendations

Any admin can mark a movie as one of their personal recommendations from the movie's detail page — a small "+ Recommend this movie" toggle sits next to the title. Each admin's recommendation is independent: a movie can carry zero, one, or both admins' picks at once, and each shows as its own badge (a colored circle with the admin's initial — a placeholder until real per-admin icon images are provided) next to the title and on the movie's card everywhere it appears in search/browse grids.

## Admin Poster Overrides

If a movie's TMDB poster is missing, low-quality, or wrong, admins can upload a replacement (JPEG/PNG/WebP, 5MB max) directly on the movie page. The override is stored in [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) and always takes priority over the TMDB poster when set; admins can remove it to fall back to TMDB's image again.

To enable this locally or in your own deployment, create a Blob store in your Vercel project's **Storage** tab and connect it — Vercel injects `BLOB_READ_WRITE_TOKEN` automatically for deployed environments, and you can run `vercel env pull` to get it into your local `.env`. Without this token, poster uploads will fail, but the rest of the app is unaffected.

## Visual Theme

The site's base look (backgrounds, text, accents) is defined once in `src/app/globals.css` as a Tailwind `@theme` override of the neutral/red/yellow/amber color scales, so it applies everywhere those Tailwind classes are used. This palette has changed once already (from a dark neutral theme to a warmer ink-and-paper "Poster House" palette) — check `src/app/globals.css` for the current definition and its inline comment before assuming a specific look when building new UI.

Fight Scene cards ("Fight Ticket" styling) are the one exception: they use hardcoded hex colors rather than the shared Tailwind scale, so they deliberately keep their ink-on-cream, ticket-stub look regardless of whatever the site-wide theme is set to.

## Admin Area & Roles

Three roles exist: `USER` (the default member role), `REVIEWER`, and `ADMIN`. Signed-in `ADMIN`/`REVIEWER` accounts get an "Admin" link in the navbar to `/admin` &mdash; a dashboard linking every admin section that lives on its own page, gated by `requireReviewerSession()` (`ADMIN` or `REVIEWER`) in `src/app/admin/layout.tsx`; individual sections and API routes narrow further to `ADMIN`-only where noted below via `requireAdminSession()`.

- **Movies** (`/admin/movies`) &mdash; a **Pending Submissions** section (see [Member Movie Submissions](#member-movie-submissions) above) to approve or reject member-submitted movies, open to `REVIEWER` too. The **Catalog** section below it (browse and permanently delete any movie, cascading through everything attached to it) is `ADMIN`-only — a reviewer's reject action only ever deletes a still-`PENDING` row via a separate endpoint, never an already-approved catalog entry.
- **Import from TMDB** (`/admin/import`, `ADMIN`-only) &mdash; search-and-import by title or by keyword (see [TMDB Import](#tmdb-import) above), plus a bulk-upload section: a CSV with a `title` column (optionally `year` to disambiguate identically-titled results, or `tmdb_id` to skip the search entirely) imports up to 25 movies in one request. Each row is resolved and imported independently, so one bad row (no TMDB match, a transient TMDB error) doesn't fail the rest of the batch &mdash; the response reports created/updated/error per row. CSV parsing uses `papaparse` rather than the `xlsx` npm package, whose published version has known unpatched advisories (SheetJS fixed them only on their own CDN, not on the npm registry).
- **Fight Scene Tags** (`/admin/fight-scene-tags`) &mdash; manage the category vocabulary members tag fight scenes with (see [Fight Scenes](#fight-scenes) above). Open to `REVIEWER`.
- **News & Updates** (`/admin/news`, `ADMIN`-only) &mdash; publish, edit, or delete posts shown on the homepage and the `/news` archive (see [News & Updates](#news--updates) above).
- **Account** (`/admin/account`) &mdash; change your own sign-in email or password (previously only possible via direct SQL). Changing your email re-triggers the normal email-verification flow on the new address; changing your password requires your current one (unless you signed up via Google and have never set one, in which case you can set an initial password). Either change signs you out immediately, since the session is JWT-based and won't otherwise pick up the new credentials until you sign back in. Open to `REVIEWER` too — self-managing your own credentials isn't a content-moderation power, so it follows the same "reach `/admin` at all" gate as the dashboard itself.

Outside this dashboard, fight scene verification (the Verify/Unverify link on a fight scene card) is also open to `REVIEWER`, gated by its own `canVerify` prop on `FightSceneSection` — deliberately not the same prop as the component's `isAdmin`, which still gates a scene's Editors' rating/note, start-time adjustment, and delete-any-scene, none of which `REVIEWER` has. Editors' Score, editorial reviews, poster overrides, and discussion moderation are `ADMIN`-only actions that stay inline on the regular movie page.

There's no user-management UI for granting `REVIEWER`/`ADMIN` — promoting an account is a direct `UPDATE "User" SET role = 'REVIEWER' WHERE email = '...'` against the database, same as `ADMIN` always has been. A reasonable next step if the admin area grows further.

## Weekly Trending Carousel

`/api/cron/weekly-featured` recomputes the top 5 most-active movies (by ratings + discussion activity in the last 7 days) and is protected by the `CRON_SECRET` env var (sent as `Authorization: Bearer <CRON_SECRET>`). `vercel.json` schedules this to run weekly via [Vercel Cron](https://vercel.com/docs/cron-jobs) — Vercel automatically attaches that header when `CRON_SECRET` is set as a project environment variable.

Each slide prefers a fight scene clip over the static TMDB backdrop:

- **Which scene**: for each featured movie, the highest member-rated verified fight scene is chosen, falling back to highest editor-rated, then earliest-tagged. Unverified scenes are never selected.
- **Which moment**: the clip starts at the scene's tagged `youtubeStartSeconds` (see [Fight Scenes](#fight-scenes) below) rather than the beginning of the source video, capped to a 15-second window — matched to the carousel's rotation interval so a slide's clip finishes once before it advances.
- **Playback**: muted, looping, no player controls, starts immediately when its slide becomes active.
- **Accessibility**: never plays for visitors with `prefers-reduced-motion` set — they always see the static backdrop.
- **Fallback**: a movie with no verified fight scene keeps the static backdrop unchanged.

## Security

- **Headers**: `next.config.ts`'s `headers()` sets `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Strict-Transport-Security` on every response (pages and API routes alike). `src/proxy.ts` separately sets a nonce-based `Content-Security-Policy` — `script-src` uses a per-request nonce plus `'strict-dynamic'` rather than a static allowlist, following [Next.js's documented CSP pattern](https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy), so Next's own injected scripts work without `'unsafe-inline'`. `'unsafe-eval'` is added to `script-src` in development only (Turbopack's dev server/React Refresh needs it; production builds don't). `img-src`/`frame-src` explicitly allowlist the external hosts the app actually embeds: `image.tmdb.org`, `*.public.blob.vercel-storage.com`, `img.youtube.com`, and `youtube-nocookie.com`.
  - Locally, expect one harmless console warning about `/_vercel/insights/script.js` returning the wrong MIME type — that path is only handled specially by Vercel's actual platform; `next dev`/`next start` don't serve it, so Web Analytics is a documented no-op outside a real Vercel deployment. Not a CSP misconfiguration.
  - Running `next start` locally (not `next dev`) also needs `AUTH_TRUST_HOST=true` in your `.env` — Auth.js v5 is stricter about validating the request host outside development mode.
- **Dependencies**: `npm audit` is expected to report 0 vulnerabilities; re-run `npm audit fix` (and bump `next`/`prisma` directly if a fix needs a version not covered by their `^` range) if a future dependency update reintroduces any.
- **Rate limiting**: `src/lib/rate-limit.ts` throttles the endpoints most worth throttling — login (5 attempts / 5 min, keyed by email), registration and forgot-password (5 / 10 min, keyed by IP), resend-verification (3 / hour, keyed by user), and the content-creation endpoints (discussion posts, fight scene submissions, movie submissions, list creation — 10-20 / 10 min, keyed by user). Login failures caused by rate limiting look identical to a wrong password (a generic `CredentialsSignin` error) so the limiter doesn't leak its own state to an attacker. Backed by [Upstash Redis](https://upstash.com) via `@upstash/ratelimit`, so limits are enforced correctly across serverless instances rather than reset per cold start. Without `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` configured, rate limiting is a no-op — every request is allowed, not blocked — so local dev and CI work unchanged. To enable it, create a free database at [console.upstash.com](https://console.upstash.com), copy its REST URL/token into `.env`, and restart the dev server.
- **CAPTCHA**: registration and forgot-password both render a [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/) widget and verify the token server-side, guarding the two flows most attractive to automated bulk abuse (mass account creation, mass password-reset email spam). Not added to login — that's already covered by the per-email rate limit above, and a CAPTCHA on every mistyped password would just be friction for legitimate members. Without `NEXT_PUBLIC_TURNSTILE_SITE_KEY`/`TURNSTILE_SECRET_KEY` configured, no widget renders and no verification is required — local dev and CI work unchanged. To enable it, create a free widget at [the Cloudflare dashboard](https://dash.cloudflare.com/?to=/:account/turnstile) and copy its site key/secret key into `.env`.
- **Password hashing**: bcrypt cost factor 12 (OWASP's current recommended minimum, bumped from 10).
- Registration intentionally still reveals whether an email is already registered (`"An account with that email already exists"`) rather than a generic response — closing that fully would mean dropping the instant sign-in that currently happens right after registration, for everyone, to guard against a risk (bulk email harvesting) that CAPTCHA above already covers. See `DECISIONS.md` for the full reasoning.
- **Session invalidation on password change**: sessions use Auth.js's JWT strategy, which by default keeps a session valid purely from its cookie's signature — a password reset wouldn't otherwise revoke sessions that already exist elsewhere (a different device, a stolen cookie). `auth.ts`'s `jwt` callback compares the account's `User.passwordChangedAt` against the value baked into the session at sign-in on every request, and signs the session out the moment they no longer match. This is what makes forgot-password (and an admin's own password change) actually lock out anyone else who was already signed in, not just change the password going forward. One side effect: shipping this signs every currently-active session out once (a session issued before this check existed has no baseline to compare, so it's always treated as stale) — a one-time, harmless global sign-out, not a bug.
- **Poster upload validation**: `admin/movies/[id]/poster` sniffs the uploaded file's actual signature ("magic bytes") rather than trusting the browser-reported `Content-Type`/`File.type`, which a client fully controls independent of what bytes it actually sends. A file that doesn't match a real JPEG/PNG/WebP signature is rejected outright, and the sniffed type (not the client-declared one) is what gets stored as the blob's `Content-Type`.

## Continuous Integration

`.github/workflows/ci.yml` runs `npm run lint` and `npm run build` on every push and pull request. It needs no database or secrets — the app has no statically-generated pages that touch Prisma at build time, so `next build` succeeds without a live connection, and `npm ci` regenerates the Prisma client automatically via a `postinstall` hook.

## Deploying

1. Push this repo to GitHub and import it into [Vercel](https://vercel.com/new).
2. Set the environment variables from `.env.example` in the Vercel project settings (use a hosted Postgres connection string).
3. Run `npx prisma migrate deploy` against the production database (Vercel's build step, or manually).
4. Update the Google OAuth redirect URI to your production domain.

## Footer & About Page

Every page has a site-wide footer (`src/components/footer.tsx`) with
`About` and `News` links on the left and a build version indicator on the
right. It's deliberately not in the main navbar — Movies/Fights/Lists stays
focused on the core browsing links.

`/about` is a public page with four sections: what the site is, how the
catalog is curated (echoing the TMDB keyword-search curation described
under [TMDB Import](#tmdb-import) above), how to reach an admin with
feedback or a bug report, and community guidelines for discussion posts and
fight scene submissions.

The build version indicator (`src/components/build-version.tsx`) shows a
small `Build <short commit SHA>` line (with a `· preview`/`· development`
suffix on non-production deploys), reading Vercel's built-in
`VERCEL_GIT_COMMIT_SHA`/`VERCEL_ENV` system environment variables — no setup
or manual version bump needed. It exists to make "is this the deploy I
think it is?" a glance instead of a debugging session. Locally (no Vercel
env), it shows "Local dev build" instead.

## News & Updates

Admins can publish short posts (title + up to 10,000 characters) from
`/admin/news`. The homepage shows only the single latest post as a thin
teaser banner directly under the hero carousel — a red "Latest Update"
label, the post's title, and a "Read more →" link, the whole banner
clickable through to the full paginated archive at `/news` (10 per page,
same Previous/Next pattern used elsewhere). The `/news` archive shows each
post's full text, clamped to 4 lines with a "Show more" toggle once it's
long enough to need one, reusing the same clamp pattern the homepage's
Recent Reviews by Editors feed already established.

Any admin can edit or delete any post, mirroring Editorial Reviews'
shared-not-per-author model.

## Web Analytics

[Vercel Web Analytics](https://vercel.com/docs/analytics) is wired up via the `<Analytics />` component from `@vercel/analytics/next` in the root layout — it tracks page views once deployed, no cookies/consent banner needed (Vercel's Web Analytics is cookieless).

It needs to be turned on per-project after deploying: **Vercel dashboard → this project → Analytics tab → Enable**. Until enabled there, the component is a no-op — nothing to configure locally, and no `.env` variable involved.

## Project Structure

- `src/app` — pages and API routes (App Router), including the `/admin` dashboard and its sub-pages (see [Admin Area & Roles](#admin-area--roles)), the fight scene permalink route (`/movies/[id]/fight-scenes/[fightSceneId]`), member movie submission (`/movies/submit`), member profiles (`/members/[username]`), public list permalinks (`/lists/[listId]`), and actor pages (`/actors/[personId]`)
- `src/components` — UI components (`fight-scene-section.tsx`, `editorial-review.tsx`, `poster-override-control.tsx`, `share-button.tsx`, `member-list-manager.tsx`, `add-to-list-control.tsx`, etc.)
- `src/lib` — Prisma client, Auth.js config, TMDB client, YouTube URL parsing, rating/weekly-featured/verification/fight-scene/username/member-list helpers, email sender
- `prisma/schema.prisma` — data model
- `prisma/seed.ts` — sample/dev seed data, including a sample fight scene and editorial review

## Out of Scope (for now)

Person/actor detail pages, catalog-wide pagination, reply notifications, a user-facing "report post" flow, "related movies" recommendations, and fight scene moderation beyond owner/admin delete are not yet implemented.
