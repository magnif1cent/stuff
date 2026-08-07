# Kung Fu Movie Database

An IMDB-style website for kung fu and martial arts films, built for martial arts movie enthusiasts. Movie data is sourced from [TMDB](https://www.themoviedb.org/).

## Features

- Landing page with a weekly-rotating "trending" carousel (top 5 most-active movies over the last 7 days) and a recently-added grid — each slide plays a short preview of the movie's best verified fight scene when one exists, falling back to the static backdrop otherwise (see [Weekly Trending Carousel](#weekly-trending-carousel) below)
- Search by movie title, actor, or director name, with filters (genre, director, actor, country, release-year range, minimum community rating, minimum editor rating), sorting (relevance, highest rated, newest, oldest), pagination, and a typo-tolerant "did you mean" fallback when nothing matches exactly — plus a dedicated fight-scene search at `/search/fight-scenes` (filter by tag, actor, member/editor rating) — see [Search](#search) below
- Movie pages with cast, synopsis, a community rating, a separate admin-only "Editors' Score", an admin-authored editorial review, and a per-movie discussion thread (with spoiler tags, edit/delete on your own posts, and admin moderation)
- **Fight Scenes**: members tag specific fight scenes within a movie — YouTube clip (with an optional start timestamp), the actors involved (picked from that movie's cast), and category tags (e.g. "Weapon Duel", "One vs. Many") — with their own member rating, a separate admin rating, admin verification, and a shareable permalink page (see [Fight Scenes](#fight-scenes) below)
- Member accounts via email/password (with email verification) or Google sign-in, identified publicly by a chosen username rather than their email or real name (see [Usernames](#usernames) below)
- Member capabilities: rate movies and fight scenes, maintain a Favorites list and a Watchlist, create their own public named lists on a profile page at `/members/[username]` (see [Member Lists & Profiles](#member-lists--profiles) below), post/reply in movie discussions, submit fight scenes, and submit a movie missing from the catalog for admin review (see [Member Movie Submissions](#member-movie-submissions) below)
- A unified `/admin` dashboard (Movies management incl. pending-submission review and permanent deletion, TMDB import incl. title search, keyword search, and bulk CSV upload, Fight Scene Tags, Account settings) plus admin actions that stay inline on regular pages (Editors' Score, editorial reviews, poster overrides, fight scene verification) &mdash; see [Admin Area](#admin-area) below
- Social sharing (native share sheet on mobile, copy-link/X/Facebook/Reddit fallback on desktop) on movie and fight scene pages
- A public `/leaderboard` page ranking the Most-Liked Lists (members can like each other's public custom lists) and Top Curators (members with the most movies across their own lists) — see [Member Lists & Profiles](#member-lists--profiles) below

## Tech Stack

- [Next.js](https://nextjs.org/) (App Router) + TypeScript + Tailwind CSS
- [Prisma ORM](https://www.prisma.io/) 7 + PostgreSQL (via the `@prisma/adapter-pg` driver adapter)
- [Auth.js (NextAuth) v5](https://authjs.dev/) — Credentials (email/password) + Google OAuth
- [TMDB API](https://developer.themoviedb.org/docs) for movie/person data
- [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) for admin-uploaded poster overrides

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

Fill in `DATABASE_URL`, `TMDB_API_KEY`, `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`, and generate an `AUTH_SECRET`. `RESEND_API_KEY`/`EMAIL_FROM` are optional — see [Email Verification](#email-verification) below. `BLOB_READ_WRITE_TOKEN` is optional too — see [Admin Poster Overrides](#admin-poster-overrides).

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

## Discussion & Moderation

- Any signed-in member can post and reply (one level of replies) on a movie's discussion thread. Discussion is paginated (20 posts/page, "Load more") and content is capped at 5,000 characters.
- Wrap text in `[spoiler]...[/spoiler]` to hide it behind a "click to reveal" toggle — useful for plot twists/endings discussed on the movie's own page. Note this is a client-side reveal (like most forum spoiler tags): the text is present in the page's data, just not shown until clicked, so it isn't a substitute for redacting genuinely secret data.
- Authors can edit or delete their own posts; admins can delete anyone's post. Deletion is a soft-delete — the row and any replies underneath it are kept (so a thread doesn't fall apart when one comment in it is removed), but the content is blanked and the post renders as `[deleted]`.

## Search

Two dedicated search pages, both with a vertical sidebar of filters, pagination, and sort options — split apart because a fight-scene result is the scene itself, not "a movie that happens to contain one."

- **`/search`** (movies) — filters: genre, director (autocomplete), actor (autocomplete), country, release-year range, minimum community rating, minimum editor rating. Sort by relevance, highest rated, newest, or oldest. A typo-tolerant "did you mean" fallback (via Postgres `pg_trgm`, see [Getting Set Up](#getting-set-up)) kicks in when nothing matches exactly.
- **`/search/fight-scenes`** — filters: category tag (multi-select, matches any selected), actor (autocomplete, scoped to people actually tagged in a fight scene — not just anyone in a movie's cast), minimum member rating, minimum editor rating. Sort by newest, highest member rated, or highest editor rated.
- The navbar's search box submits to `/search` in "browse" mode (no filters) when submitted empty, rather than doing nothing — both pages are also reachable directly via the "Browse" and "Fight Scenes" nav links.

## TMDB Import

`/admin/import` has three ways to find and import movies — search-and-browse (title or keyword) for discovering films, or CSV upload when you already know exactly what you want:

- **By title** — search TMDB by movie title and import one result at a time. Good for a specific film you already know by name.
- **By keyword** — search for one or more TMDB keywords (e.g. "kung fu", "martial arts"), optionally narrow by production country (a curated dropdown of common origins like Hong Kong, China, Taiwan — TMDB's `with_origin_country` accepts any ISO 3166-1 code, the dropdown just picks common ones), then browse matching movies (20 per page, "Load more" to page further) with poster, title, release year, production country, and top-billed cast shown for each, so you can judge relevance before importing. Selecting multiple keywords matches movies tagged with *any* of them (TMDB's `with_keywords` OR logic), not all of them; the country filter ANDs against that. Results are pre-checked by default — uncheck the ones that don't belong rather than checking the ones you want — and movies already in your catalog are shown but excluded from selection. "Import selected" imports the checked movies (a few at a time, not all at once) and reports how many succeeded.
  - TMDB's `/discover/movie` endpoint (used for keyword search) caps at page 500 (10,000 results) regardless of how many total matches it reports; a search with more matches than that needs narrowing (e.g. an additional keyword or a country filter) to reach everything.
  - Country and cast require an extra per-movie detail lookup beyond what the base keyword search returns, so each page of 20 keyword results costs more TMDB requests than a title search does — still well within TMDB's rate limits for realistic result counts, just not instant.
  - `with_origin_country` isn't in TMDB's official (outdated) API docs, though it's confirmed working and referenced by TMDB's own support — worth knowing if it ever needs debugging.
- **Bulk CSV upload** — for when you already have a list of titles in hand rather than needing to discover them; see [Admin Area](#admin-area) below for the format.

## Member Lists & Profiles

Every member has a profile page at `/members/[username]`. Viewing your own shows Favorites, Watchlist, and your custom lists with full management controls (create/rename/delete); viewing someone else's shows only their public custom lists, read-only. `/my-lists` still works as a link — it just redirects to your own profile.

Beyond the built-in Favorites and Watchlist, members can create any number of their own named lists (e.g. "Best One-vs-Many Fights") from the "+ Add to list" control on a movie page, and manage them from their own profile.

- **Custom lists are public by design; Favorites/Watchlist are not.** Every custom list has its own shareable permalink at `/lists/[id]` (also reachable via its owner's profile) that anyone can view signed in or not, with no private option. Favorites and Watchlist stay exactly as private as they've always been: only the signed-in owner ever sees their own, on their own profile or anywhere else.
- A member can have at most 25 lists, with unique names per member; list names are capped at 60 characters.
- A pending (not yet admin-approved) movie can only be added to a list by its own submitter, and is excluded from the public list/profile view for everyone else, the same as it's excluded from every other public listing — see [Member Movie Submissions](#member-movie-submissions) below.
- **Liking lists and the leaderboard**: any signed-in, verified member other than the list's own owner can like a public custom list (one like per member per list; self-likes are blocked). `/leaderboard` — reachable via the "Leaderboard" nav link, replacing what used to be a redundant "My Lists" link pointing at the same place as the username link — ranks the Most-Liked Lists and, separately, Top Curators (members with the most total movies across their own lists). Both rankings recompute on every page load rather than being cached/scheduled.

## Member Movie Submissions

If a member searches and can't find a movie, `/movies/submit` (linked from a "no results" search) lets them search TMDB and submit a match directly — the same underlying TMDB import used by `/admin/import`, but scoped to one title at a time and requiring a verified email.

- **Submissions start `PENDING`**, not live: hidden from the homepage, search (including the navbar's), autocomplete director/actor filters, and the weekly-trending computation, and its own movie page 404s for everyone except the submitter and admins. This mirrors fight-scene verification's "member-created content, admin-gated visibility" pattern rather than admin imports' "goes live immediately" one, since anyone can trigger this path, not just a trusted admin.
- Submitting a `tmdbId` that's already in the catalog (approved or still pending) is rejected with a specific error rather than silently re-importing it — re-running the shared import logic on an existing row would otherwise reset an already-approved movie back to pending.
- Admins review submissions in a **Pending Submissions** section at the top of `/admin/movies` — Approve moves it to the catalog immediately; Reject permanently deletes it, same as deleting any other catalog entry.

## Fight Scenes

Below the cast list on every movie page, members can catalog individual fight scenes from that film:

- **Add a scene**: paste a YouTube URL (any watch/shorts/embed/`youtu.be`/live link, with an optional `t=`/`start=` timestamp used as the clip's initial start time), give it a title (the submitter can auto-fill from the video's public oEmbed title), tag which of the movie's own cast members are in it, and optionally attach up to 10 category tags. Requires a verified email.
- **Adjusting the start time**: only admins can set or change where a clip starts playing, via a "Start at" mm:ss control shown inline on each scene — no need to re-paste the YouTube link to retime it. A submitter's own edits (title, cast, tags, or even swapping the link) never touch the start time; it's admin-managed independently once the scene exists.
- **Round numbers** aren't stored — they're computed on read as the scene's position, by creation order, among that movie's non-deleted scenes. Delete scene 2 of 3 and the old scene 3 becomes Round 2 automatically.
- **Ratings**: members rate a scene 1–10 (one rating per member, editable); admins have a separate rating with an optional note, mirroring the movie-level Editors' Score.
- **Verification**: admins can mark a scene "Verified" as a quality signal. Editing a scene's content clears verification, since an admin's earlier check no longer vouches for what's there now.
- **Editing/deleting**: the submitter can edit or delete their own scene; admins can delete anyone's. Deletion is a soft-delete (like discussion posts) so ratings tied to a scene aren't orphaned.
- **Tags**: the tag list itself (e.g. "Weapon Duel", "One vs. Many") is admin-curated at `/admin/fight-scene-tags` — members choose from it but can't create new tags.
- **Permalinks**: each fight scene has its own page at `/movies/[id]/fight-scenes/[fightSceneId]` with dynamic Open Graph metadata (title, rating summary, YouTube thumbnail) for clean link previews when shared.

## Editorial Reviews

Admins can write a long-form review (up to 10,000 characters) for any movie, shown alongside the cast list. There's one review per movie — any admin can write or update it, and the page just tracks who last touched it.

## Admin Poster Overrides

If a movie's TMDB poster is missing, low-quality, or wrong, admins can upload a replacement (JPEG/PNG/WebP, 5MB max) directly on the movie page. The override is stored in [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) and always takes priority over the TMDB poster when set; admins can remove it to fall back to TMDB's image again.

To enable this locally or in your own deployment, create a Blob store in your Vercel project's **Storage** tab and connect it — Vercel injects `BLOB_READ_WRITE_TOKEN` automatically for deployed environments, and you can run `vercel env pull` to get it into your local `.env`. Without this token, poster uploads will fail, but the rest of the app is unaffected.

## Visual Theme

The site's base look (backgrounds, text, accents) is defined once in `src/app/globals.css` as a Tailwind `@theme` override of the neutral/red/yellow/amber color scales, so it applies everywhere those Tailwind classes are used. This palette has changed once already (from a dark neutral theme to a warmer ink-and-paper "Poster House" palette) — check `src/app/globals.css` for the current definition and its inline comment before assuming a specific look when building new UI.

Fight Scene cards ("Fight Ticket" styling) are the one exception: they use hardcoded hex colors rather than the shared Tailwind scale, so they deliberately keep their ink-on-cream, ticket-stub look regardless of whatever the site-wide theme is set to.

## Admin Area

Signed-in admins get an "Admin" link in the navbar to `/admin` &mdash; a dashboard linking every admin section that lives on its own page, all guarded by the same `requireAdminSession()` check in `src/app/admin/layout.tsx`:

- **Movies** (`/admin/movies`) &mdash; a **Pending Submissions** section (see [Member Movie Submissions](#member-movie-submissions) above) to approve or reject member-submitted movies, plus the catalog itself: browse and permanently delete a movie entry (type the title to confirm). Deleting cascades through everything attached to it: cast credits, ratings, discussion posts, fight scenes (and their own casts/ratings), the editorial review, and weekly-featured entries.
- **Import from TMDB** (`/admin/import`) &mdash; search-and-import by title or by keyword (see [TMDB Import](#tmdb-import) above), plus a bulk-upload section: a CSV with a `title` column (optionally `year` to disambiguate identically-titled results, or `tmdb_id` to skip the search entirely) imports up to 25 movies in one request. Each row is resolved and imported independently, so one bad row (no TMDB match, a transient TMDB error) doesn't fail the rest of the batch &mdash; the response reports created/updated/error per row. CSV parsing uses `papaparse` rather than the `xlsx` npm package, whose published version has known unpatched advisories (SheetJS fixed them only on their own CDN, not on the npm registry).
- **Fight Scene Tags** (`/admin/fight-scene-tags`) &mdash; manage the category vocabulary members tag fight scenes with (see [Fight Scenes](#fight-scenes) above).
- **Account** (`/admin/account`) &mdash; change your own admin sign-in email or password (previously only possible via direct SQL). Changing your email re-triggers the normal email-verification flow on the new address; changing your password requires your current one (unless you signed up via Google and have never set one, in which case you can set an initial password). Either change signs you out immediately, since the session is JWT-based and won't otherwise pick up the new credentials until you sign back in.

Account management is deliberately self-service (an admin managing their own credentials) rather than a full user-management CRUD (promoting other users to admin, resetting someone else's password, etc.) &mdash; a reasonable next step if the admin area grows further.

Not every admin capability lives in this dashboard — Editors' Score, editorial reviews, poster overrides, and fight scene verification are admin-only actions that stay inline on the regular movie/fight-scene pages they act on, rather than being relocated here.

## Weekly Trending Carousel

`/api/cron/weekly-featured` recomputes the top 5 most-active movies (by ratings + discussion activity in the last 7 days) and is protected by the `CRON_SECRET` env var (sent as `Authorization: Bearer <CRON_SECRET>`). `vercel.json` schedules this to run weekly via [Vercel Cron](https://vercel.com/docs/cron-jobs) — Vercel automatically attaches that header when `CRON_SECRET` is set as a project environment variable.

Each slide prefers a fight scene clip over the static TMDB backdrop:

- **Which scene**: for each featured movie, the highest member-rated verified fight scene is chosen, falling back to highest editor-rated, then earliest-tagged. Unverified scenes are never selected.
- **Which moment**: the clip starts at the scene's tagged `youtubeStartSeconds` (see [Fight Scenes](#fight-scenes) below) rather than the beginning of the source video, capped to a 15-second window — matched to the carousel's rotation interval so a slide's clip finishes once before it advances.
- **Playback**: muted, looping, no player controls, starts immediately when its slide becomes active.
- **Accessibility**: never plays for visitors with `prefers-reduced-motion` set — they always see the static backdrop.
- **Fallback**: a movie with no verified fight scene keeps the static backdrop unchanged.

## Continuous Integration

`.github/workflows/ci.yml` runs `npm run lint` and `npm run build` on every push and pull request. It needs no database or secrets — the app has no statically-generated pages that touch Prisma at build time, so `next build` succeeds without a live connection, and `npm ci` regenerates the Prisma client automatically via a `postinstall` hook.

## Deploying

1. Push this repo to GitHub and import it into [Vercel](https://vercel.com/new).
2. Set the environment variables from `.env.example` in the Vercel project settings (use a hosted Postgres connection string).
3. Run `npx prisma migrate deploy` against the production database (Vercel's build step, or manually).
4. Update the Google OAuth redirect URI to your production domain.

## Project Structure

- `src/app` — pages and API routes (App Router), including the `/admin` dashboard and its sub-pages (see [Admin Area](#admin-area)), the fight scene permalink route (`/movies/[id]/fight-scenes/[fightSceneId]`), member movie submission (`/movies/submit`), member profiles (`/members/[username]`), and public list permalinks (`/lists/[listId]`)
- `src/components` — UI components (`fight-scene-section.tsx`, `editorial-review.tsx`, `poster-override-control.tsx`, `share-button.tsx`, `member-list-manager.tsx`, `add-to-list-control.tsx`, etc.)
- `src/lib` — Prisma client, Auth.js config, TMDB client, YouTube URL parsing, rating/weekly-featured/verification/fight-scene/username/member-list helpers, email sender
- `prisma/schema.prisma` — data model
- `prisma/seed.ts` — sample/dev seed data, including a sample fight scene and editorial review

## Out of Scope (for now)

Person/actor detail pages, catalog-wide pagination, rate limiting, reply notifications, a user-facing "report post" flow, "related movies" recommendations, and fight scene moderation beyond owner/admin delete are not yet implemented.
