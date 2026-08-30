# Kung Fu Sauce

An IMDB-style website for kung fu and martial arts films, built for martial arts movie enthusiasts. Movie data is sourced from [TMDB](https://www.themoviedb.org/).

## Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Set Up](#getting-set-up)
  - [1. Install dependencies](#1-install-dependencies)
  - [2. Get a PostgreSQL database](#2-get-a-postgresql-database)
  - [3. Get a TMDB API key](#3-get-a-tmdb-api-key)
  - [4. Set up Google OAuth (optional, for "Sign in with Google")](#4-set-up-google-oauth-optional-for-sign-in-with-google)
  - [5. Configure environment variables](#5-configure-environment-variables)
  - [6. Apply the database schema and seed sample data](#6-apply-the-database-schema-and-seed-sample-data)
  - [7. Run the app](#7-run-the-app)
- [Usernames](#usernames)
- [Email Verification](#email-verification)
- [Password Recovery](#password-recovery)
- [Ratings](#ratings)
- [Discussion & Moderation](#discussion-moderation)
- [Search](#search)
- [TMDB Import](#tmdb-import)
- [Member Lists & Profiles](#member-lists-profiles)
- [Member Movie Submissions](#member-movie-submissions)
- [Fights](#fights)
- [Fight Count](#fight-count)
- [Fun Facts](#fun-facts)
- [Actor Pages](#actor-pages)
- [Reviews](#reviews)
- [You Might Also Like](#you-might-also-like)
- [Admin Recommendations](#admin-recommendations)
- [Admin Poster Overrides](#admin-poster-overrides)
- [Visual Theme](#visual-theme)
- [Admin Area & Roles](#admin-area-roles)
- [Weekly Trending Carousel](#weekly-trending-carousel)
- [Security](#security)
- [Continuous Integration](#continuous-integration)
- [Deploying](#deploying)
- [Footer & About Page](#footer-about-page)
- [News & Updates](#news-updates)
- [Community Activity](#community-activity)
- [Web Analytics](#web-analytics)
- [Error Monitoring](#error-monitoring)
- [Project Structure](#project-structure)
- [Out of Scope (for now)](#out-of-scope-for-now)

## Features

- Landing page with a weekly-rotating "trending" carousel (top 5 most-active movies over the last 7 days) and a recently-added grid — each slide plays a short preview of the movie's best verified fight scene when one exists, falling back to the static backdrop otherwise (see [Weekly Trending Carousel](#weekly-trending-carousel) below)
- Search by movie title, actor, or director name, with filters (genre, director, actor, country, release-year range, minimum community rating, minimum editor rating), sorting (relevance, highest rated, newest, oldest), pagination, and a typo-tolerant "did you mean" fallback when nothing matches exactly — plus a dedicated fight-scene search at `/search/fights` (filter by tag, actor, member/editor rating) — see [Search](#search) below
- Movie pages with cast, synopsis, a community rating, a separate admin-only "Editors' Score", an admin-authored editorial review, and a per-movie discussion thread (with spoiler tags, edit/delete on your own posts, and admin moderation). Members and admins can also rate a movie by category (Fight Choreography, Story, Acting) alongside the overall score, shown as a per-category average when at least one rating exists — see [Ratings](#ratings) below
- **Fights**: members tag specific fight scenes within a movie — YouTube clip (with an optional start timestamp), the actors involved (picked from that movie's cast), and category tags (e.g. "Weapon Duel", "One vs. Many") — with their own member rating, a separate admin rating, admin verification, and a shareable permalink page (see [Fights](#fights) below)
- **Fight Count**: a member-maintained "true" fight count on every movie page, separate from the count of cataloged Fights — see [Fight Count](#fight-count) below
- **Fun Facts**: an IMDB "Did you know"-style trivia section above the Discussion thread — members add individual entries, and other members thumbs-up/down each one, ranked by net vote score — see [Fun Facts](#fun-facts) below
- Actor pages (`/actors/[personId]`) showing an actor's filmography and every fight scene they're tagged in, linked from a movie's cast list and a scene's "Featuring" line (see [Actor Pages](#actor-pages) below)
- Member accounts via email/password (with email verification and self-service password recovery) or Google sign-in, identified publicly by a chosen username rather than their email or real name (see [Usernames](#usernames) and [Password Recovery](#password-recovery) below)
- Member capabilities: rate movies and fight scenes, maintain a Favorites list and a Watchlist for movies (fight scenes get a Favorite only — see below), create their own public named lists on a profile page at `/members/[username]` and save both movies and fight scenes to them (see [Member Lists & Profiles](#member-lists--profiles) below), post/reply in movie discussions, submit fight scenes, and submit a movie missing from the catalog for admin review (see [Member Movie Submissions](#member-movie-submissions) below)
- A unified `/admin` dashboard (Movies management incl. pending-submission review and permanent deletion, TMDB import incl. title search, keyword search, and bulk CSV upload, Fight Scene Tags, News & Updates, Account settings), shared by two roles &mdash; `ADMIN` (everything) and a narrower `REVIEWER` (movie-submission review, fight-scene-tag management, fight-scene verification) &mdash; plus admin actions that stay inline on regular pages (Editors' Score, editorial reviews, poster overrides, fight scene verification) &mdash; see [Admin Area & Roles](#admin-area--roles) below
- Social sharing (native share sheet on mobile, copy-link/X/Facebook/Reddit fallback on desktop) on movie and fight scene pages
- A public `/lists` page for browsing every member's public custom lists (sorted by newest-updated or most-liked, paginated), plus a `/leaderboard` page ranking the Most-Liked Lists (members can like each other's public custom lists) and Top Curators (members with the most movies across their own lists) — see [Member Lists & Profiles](#member-lists--profiles) below
- Admin-published News & Updates posts: the latest one shown as a teaser banner on the homepage, with a full paginated archive at `/news` — see [News & Updates](#news--updates) below
- A "Community Activity" feed on the homepage surfacing the site's most recent fight scenes tagged, lists created, and discussions started, across all members — see [Community Activity](#community-activity) below
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
- [Sentry](https://sentry.io) for client/server error monitoring (see [Error Monitoring](#error-monitoring) below)

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

Fill in `DATABASE_URL`, `TMDB_API_KEY`, `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`, and generate an `AUTH_SECRET`. `RESEND_API_KEY`/`EMAIL_FROM` are optional — see [Email Verification](#email-verification) below. `BLOB_READ_WRITE_TOKEN` is optional too — see [Admin Poster Overrides](#admin-poster-overrides). `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` and `NEXT_PUBLIC_TURNSTILE_SITE_KEY`/`TURNSTILE_SECRET_KEY` are optional too — see [Security](#security). `SENTRY_DSN`/`NEXT_PUBLIC_SENTRY_DSN` are optional too — see [Error Monitoring](#error-monitoring).

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

Members are identified publicly by a username, not their email or real name — it's what shows on discussion posts, fight scenes, and editorial reviews. Usernames are 3-20 characters, letters/numbers/underscores only.

- **Case-preserving, case-insensitive**: pick `NashPopoB` and it's stored and shown exactly that way, but `nashpopob` or `NASHPOPOB` can't be registered by someone else, and `/members/nashpopob` resolves to the same profile as `/members/NashPopoB`. `User.usernameLower` (always `username.toLowerCase()`, kept in sync on every write) is the actual uniqueness/lookup key — `username` itself is no longer a unique column.
- **Credentials sign-up** requires picking a username on the registration form; taken or invalid usernames are rejected with a specific error.
- **Google sign-up** has no form step of ours to ask for one, so a starting username is auto-generated from the email's local part (sanitized to the allowed charset, with a numeric suffix if it's taken — checked case-insensitively, same as everywhere else). There's no self-service rename yet — a reasonable next step once profile editing exists.
- Accounts created before either feature (on a live deployment with existing data) are backfilled the same way, by the `20260804190000_add_username` and `20260815213501_add_username_lower` migrations — no manual action needed beyond running them.

## Email Verification

Registering with email/password creates the account immediately and sends a verification link — you can sign in and browse right away, but rating movies, managing lists, and posting in discussions require a verified email (a banner with a "Resend email" button appears until you verify). Google sign-ins are auto-verified, since Google already confirmed that address.

Without `RESEND_API_KEY` configured, the verification link is logged to the server console instead of emailed (`[email:dev] Verification link for ...`) — grab it from there for local testing. To send real emails:

1. Create a free account at [resend.com](https://resend.com) and get an API key.
2. Set `RESEND_API_KEY` (and `EMAIL_FROM`, once you've verified a sending domain in Resend — until then their shared `onboarding@resend.dev` sender only delivers to your own Resend account email).
3. To use a different provider, replace the `fetch` call in `src/lib/email.ts`.

## Password Recovery

A "Forgot password?" link on the sign-in page (`/forgot-password`) emails a reset link to accounts that signed up with email/password — Google sign-ins have no password to reset, so they get no link (see [Security](#security) below for why). The link expires in 1 hour and is single-use; requesting a new one invalidates any earlier outstanding link for that account. Uses the same `RESEND_API_KEY` setup as email verification above — without it, the reset link is logged to the server console instead (`[email:dev] Password reset link for ...`).

## Ratings

Alongside the existing overall 1–10 Community Score and admin-only Editors' Score, both members and admins can optionally rate a movie by category: **Fight Choreography**, **Story**, and **Acting**. Category ratings are a supplement, not a replacement — the overall score is unaffected by them and works exactly as before if you never touch the category widget.

- The category list is a fixed, hardcoded set (not an admin-editable taxonomy like Genres) — changing it is a code change.
- Each category is scored 1–10 independently, upserted one category at a time (like the overall score), and averaged per-category the same way the overall score is. A movie page shows a per-category average line (member average / editor average) once at least one rating exists for that category.
- Both the overall score and each category are rated via a 5-star half-click picker (still 1–10 under the hood — same half-star mechanic already used by the search filters' rating pickers) rather than a row of number buttons. Category rows only appear after an overall score has been given, to keep the widget from front-loading three extra picker rows before someone's rated at all.
- **Your Rating and Editors' Score share one card**, switched between with a small tab bar — the Editors' Rating tab only renders for admins, so anyone else sees just their own rating directly, no tab bar at all. The card tints amber while the Editors' Rating tab is open, the same "you're in admin territory" cue the two widgets used to carry separately.
- On the admin tab, the overall score and each category save the moment a star is clicked, same as the member tab. The accompanying note autosaves shortly after you stop typing (and immediately on blur) instead of needing an explicit save button — the note field stays disabled until an overall score exists, since there's nothing yet to attach a note to.
- Movies only for now — fight scenes don't have category ratings.

## Discussion & Moderation

- Any signed-in member can post and reply (one level of replies) on a movie's discussion thread. Discussion is paginated (20 posts/page, "Load more") and content is capped at 5,000 characters.
- Wrap text in `[spoiler]...[/spoiler]` to hide it behind a "click to reveal" toggle — useful for plot twists/endings discussed on the movie's own page. Note this is a client-side reveal (like most forum spoiler tags): the text is present in the page's data, just not shown until clicked, so it isn't a substitute for redacting genuinely secret data.
- Authors can edit or delete their own posts; admins can delete anyone's post. Deletion is a soft-delete — the row and any replies underneath it are kept (so a thread doesn't fall apart when one comment in it is removed), but the content is blanked and the post renders as `[deleted]`.

## Search

Two dedicated search pages, both with a vertical sidebar of filters, pagination, and sort options — split apart because a fight-scene result is the scene itself, not "a movie that happens to contain one."

- **`/search`** (movies) — filters: genre, director (autocomplete), actor (autocomplete), country, release-year range, minimum community rating, minimum editor rating. Sort by relevance, highest rated, newest, or oldest. A typo-tolerant "did you mean" fallback (via Postgres `pg_trgm`, see [Getting Set Up](#getting-set-up)) kicks in when nothing matches exactly.
- **`/search/fights`** — filters: category tag (multi-select, matches any selected), actor (autocomplete, scoped to people actually tagged in a fight scene — not just anyone in a movie's cast), the fight's movie's genre, country, and release-year range, minimum member rating, minimum editor rating, admin-verified only, and (signed-in only) favorited by me. Sort by newest, highest member rated, highest editor rated, or most favorited. Unlike `/search` (movies), which needs a query or filter before showing anything, this page shows every fight scene by default (paginated, newest first) — it's titled "Browse fight scenes," so landing on it with no input actually browses instead of prompting for one.
- **Quick-filter bubbles** above the results on `/search/fights` — one-click shortcuts into a filtered/sorted view (Top Rated, Most Favorited, Verified only, My Favorites when signed in, and every category tag) for the values that don't need free-text input, faster than opening the sidebar form. The open-ended actor filter and the movie genre/country dropdowns stay sidebar-only, since a bubble row can't represent free text or a longer option list the way it can a handful of fixed sort/tag/boolean shortcuts.
- The navbar's search box submits to `/search` in "browse" mode (no filters) when submitted empty, rather than doing nothing — both pages are also reachable directly via the "Movies" and "Fights" nav links.
- **Quick links into filtered search**: a movie's genre badges and a fight scene's category-tag badges are clickable, deep-linking straight into the matching filtered search (`/search?genre=`, `/search/fights?tag=`) instead of requiring the filter to be set by hand.
- **Indexing**: every title/director/actor-name substring search (navbar search, both search pages, the director/actor autocomplete endpoints) goes through Prisma's `contains` + `mode: "insensitive"`, which compiles to a plain `column ILIKE '%...%'` on Postgres — a different expression than the `lower(column)` trigram indexes the `pg_trgm` migration created for the "did you mean" fallback's `similarity()` calls, so those don't accelerate it. A separate migration adds plain (non-`lower()`-wrapped) trigram GIN indexes on `Movie.title`, `Movie.director`, `Person.name`, and `FightScene.title` to cover this — confirmed via `EXPLAIN` that Postgres can use them, not just assumed. At the catalog's current seed-data size the query planner still (correctly) prefers a sequential scan regardless — a handful of rows is cheaper to scan directly than to consult an index for — so this won't show up as a difference today; it's there for when the catalog grows large enough for it to matter, with nothing further to do when that happens. These four are declared directly in `schema.prisma` (a plain-column index with a custom operator class); the two `lower(...)` ones aren't and can't be — Prisma's schema DSL has no way to represent an expression index, only plain columns — so those two remain raw-SQL-only. See `DECISIONS.md` for what that undeclared state actually caused once, and why it's a real, permanent limitation rather than a TODO.

## TMDB Import

`/admin/import` has three ways to find and import movies — search-and-browse (title or keyword) for discovering films, or CSV upload when you already know exactly what you want:

- **By title** — search TMDB by movie title and import one result at a time. Good for a specific film you already know by name.
- **By keyword** — search for one or more TMDB keywords (e.g. "kung fu", "martial arts"), optionally narrow by production country (a curated dropdown of common origins like Hong Kong, China, Taiwan — TMDB's `with_origin_country` accepts any ISO 3166-1 code, the dropdown just picks common ones), then browse matching movies (20 per page, "Load more" to page further) with poster, title, release year, production country, and top-billed cast shown for each, so you can judge relevance before importing. Selecting multiple keywords matches movies tagged with *any* of them (TMDB's `with_keywords` OR logic), not all of them; the country filter ANDs against that. Results are pre-checked by default — uncheck the ones that don't belong rather than checking the ones you want — and movies already in your catalog are shown but excluded from selection. "Import selected" imports the checked movies (a few at a time, not all at once) and reports how many succeeded.
  - TMDB's `/discover/movie` endpoint (used for keyword search) caps at page 500 (10,000 results) regardless of how many total matches it reports; a search with more matches than that needs narrowing (e.g. an additional keyword or a country filter) to reach everything.
  - Country and cast require an extra per-movie detail lookup beyond what the base keyword search returns, so each page of 20 keyword results costs more TMDB requests than a title search does — still well within TMDB's rate limits for realistic result counts, just not instant.
  - `with_origin_country` isn't in TMDB's official (outdated) API docs, though it's confirmed working and referenced by TMDB's own support — worth knowing if it ever needs debugging.
- **Bulk CSV upload** — for when you already have a list of titles in hand rather than needing to discover them; see [Admin Area & Roles](#admin-area--roles) below for the format.

Every import (all three methods funnel through the same `importMovieFromTmdb`) also captures: **tagline**; **original language** (TMDB's `original_language` code resolved to its English name via `spoken_languages`, e.g. "Cantonese" rather than the bare code "cn"); primary **studio** (first of TMDB's `production_companies`); **US certification** (e.g. "PG-13" — the only region surfaced, since TMDB's per-country rating data is inconsistent enough that picking one authoritative source beats merging them); **box office revenue** in USD (shown on the movie page only when TMDB actually has a nonzero figure — 0 is normalized to "unknown" rather than displayed as $0, since that's far more common than an actual $0 gross, especially for older/foreign titles); and **franchise/collection** info (TMDB's `belongs_to_collection`, e.g. the Ip Man series) — when other entries from the same collection are already in the catalog, the movie page links directly to them, and also links to a dedicated collection page (`/collections/[collectionTmdbId]`) listing every approved movie in it alongside the collection's own aggregate community rating. `/leaderboard`'s "Top Franchises" section (see below) ranks collections by that same rating. Studio, country, language, box office, and collection are shown together in a "Details" card under the poster, kept separate from the header's own runtime/director/certification line so the two don't compete for the same space; on mobile, box office is left out of that card to save space (studio, country, and language still show there, and box office remains visible on desktop). None of this is retroactive: existing movies only get these fields on their next re-import. Top-billed cast pulled per movie is capped at 30 (up from an earlier 15).

## Member Lists & Profiles

Every member has a profile page at `/members/[username]`. Viewing your own shows a tabbed layout — Profile, Activity, Favorites, Watchlist, Pending Submissions, Favorite Fights, and Lists — each tab labeled with a live count where applicable. Viewing someone else's shows a smaller tabbed layout — Lists (their public custom lists, read-only) and Activity — since Favorites, Watchlist, Pending Submissions, and Favorite Fights all stay private to the owner. `/my-lists` still works as a link — it just redirects to your own profile.

Above the tabs, a stats strip shows member-since date, movies submitted (with how many were approved), fight scenes submitted (with how many were verified), movies rated, fight scenes rated, and discussion posts (posts and replies combined) — visible to any visitor, not just the owner, since every one of these is a summary of activity that's already public elsewhere on the site (approved/verified content, or aggregate rating counts that never reveal an individual score).

The Activity tab is the same feed as the homepage's Community Activity section (recently tagged fight scenes, created lists, and started discussions), scoped to just that one member — since that data is already fully public on the homepage for every member, showing it per-profile adds no new exposure, so it's visible on both the owner's and a visitor's view.

On your own profile, the Lists tab has a "My Lists" / "Liked" toggle inside it — your own custom lists (with full management controls: create/rename/delete) alongside public lists you've liked from other members. Liked stays owner-only even though My Lists and everyone's Activity are public, since a like is never shown publicly anywhere else in the app either — list pages only ever show an aggregate like count, never who liked it.

Every profile also has an optional bio (up to 280 characters), location (up to 100 characters), and a single website/social link, all directly editable (no click-to-expand step) from the Profile tab of your own profile and shown publicly to anyone who visits it — same visibility as the username itself. The website link is shown with a recognizable icon and platform name (X, Instagram, YouTube, TikTok, Facebook, Reddit, or Letterboxd, detected from the URL's domain; anything else falls back to a generic "Website" icon) rather than the raw URL — the same detection also previews live in the input on your own Profile tab as you type. On someone else's profile these show directly under their username, above the tabs; any unset field shows nothing there.

Members can also change their password from the Profile tab of their own profile — the same validation as everywhere else a password is set (12–72 characters). A member who already has a password must confirm the current one first; a Google-only member with no password yet gets a "Set a password" prompt instead, skipping that check. Either way, a successful change signs the member out of every device (same `passwordChangedAt` session-invalidation mechanism used by admin/reviewer password changes and forgot-password resets), so they sign back in once with the new password.

Beyond the built-in Favorites and Watchlist, members can create any number of their own named lists (e.g. "Best One-vs-Many Fights") from the "+ Add to list" control on a movie page, and manage them from their own profile. Lists hold fight scenes as well as movies — every fight scene card, wherever it appears (a movie page, its own permalink, fight scene search results, or another member's list), has its own bookmark-icon "save to list" control alongside the share icon.

- **Fight scenes get a one-tap Favorite, same red heart icon movies use, but no Watchlist** — a scene is a short clip you can watch right where it's linked, not something to queue up for later the way a full movie is. Every fight scene card has its own heart icon, independent of the movie it belongs to and independent of custom lists — you can favorite a scene without favoriting its movie, or vice versa.
- **Custom lists are public by design; Favorites/Watchlist are not.** Every custom list has its own shareable permalink at `/lists/[id]` (also reachable via its owner's profile) that anyone can view signed in or not, with no private option. Favorites and Watchlist (for both movies and fight scenes) stay exactly as private as they've always been: only the signed-in owner ever sees their own, on their own profile or anywhere else.
- A member can have at most 25 lists, with unique names per member; list names are capped at 60 characters. Each list can hold at most 200 items (movies and fight scenes combined).
- A pending (not yet admin-approved) movie can only be added to a list by its own submitter, and is excluded from the public list/profile view for everyone else, the same as it's excluded from every other public listing — see [Member Movie Submissions](#member-movie-submissions) below. A soft-deleted fight scene is excluded from a public list view the same way.
- **Descriptions, ranking, and notes**: every list — ranked or not — renders as the same row layout: a thumbnail, a FILM/FIGHT badge next to the title (with a matching color accent on the row's left edge), rating, and, for the owner, a note-edit and remove control on every row. Ranking (off by default) is the only thing that changes what's shown: on, each row also gets its position number and per-row reorder controls (move up, move down, move to top, move to bottom), merging movies and fight scenes into one ranked sequence — a specific fight scene can outrank a whole film, or vice versa. Off, rows are just sorted by when each was added. The owner flips ranking on or off with a single **Ranked list** checkbox sitting directly above the rows — no navigation away from the page, and the only place this control lives. "Edit list" opens a separate, simpler panel for name and an optional description (up to 280 characters — same cap as a member's profile bio) only; it doesn't duplicate the ranking checkbox. The owner can also attach a short note (up to 240 characters) to any item, ranked or not, shown as a pull-quote under it. Ranking is per-list, not per-item — turning it off doesn't discard any saved order or notes, it just stops the page from numbering by them. When a fight scene's own movie is also separately in the same list, its row notes the relationship ("also #3 in this list" when ranked, "also in this list" when not) instead of leaving it implicit — the two are related, even though they're two different entries.
- **Profile Lists tab shows a preview, not every item**: both your own Lists tab and another member's public lists on their profile show at most 6 movies and 6 fight scenes per list inline, with a "View full list" card linking to the list's own permalink (`/lists/[id]`) when there's more — that page has no such cap and always shows everything. This keeps a profile page's load bounded regardless of how large any one list gets, since a profile loads every list a member owns in one request.
- **Liking lists and the leaderboard**: any signed-in, verified member other than the list's own owner can like a public custom list (one like per member per list; self-likes are blocked). `/leaderboard` ranks the Most-Liked Lists and, separately, Top Curators (members with the most total movies across their own lists), Most Beloved Actors (actors ranked by `PersonFavorite` count — see [Actor Pages](#actor-pages)), and Top Franchises (TMDB collections with at least 2 approved movies in the catalog, ranked by the average of every individual community rating across all their movies — a straight weighted average, so a collection's one-star outlier with only a couple of ratings doesn't count as much as its other entries' hundreds; a collection needs at least one rating anywhere in it to appear at all). All four rankings recompute on every page load rather than being cached/scheduled.
- **Cloning a list**: any signed-in, verified member viewing someone else's non-empty public list can clone it with one click, creating their own editable copy (named "{original name} (copy)", or "(copy 2)", etc. if that name's taken) with the same movies/fight scenes, order, and ranked-or-not state. The list's description and any per-item notes are the original owner's own commentary and don't carry over — the clone starts with neither, same as a freshly created list. Counts against the cloner's own 25-list cap like any other list.
- **Browsing lists**: `/lists` — reachable via the "Lists" nav link — lists every public custom list with at least one item, sorted by newest-updated or most-liked, 24 per page in a dense grid (2 columns on mobile up to 6 on desktop). Each small card has a Spotify-playlist-style cover collage of up to 4 poster/thumbnail tiles from the list's own contents (a single square for a 1-item list, a 2x2 grid for 3-4, and so on), its name, owner, item count, and like count. A search box filters by list name or owner username. Results on each page are split into "Ranked" and "Unranked" sections (using the same `isRanked` flag every list already has) whenever that page actually has both kinds — a page of all-unranked lists (the common case) shows no section headers at all. It cross-links to `/leaderboard` and vice versa, so both surfaces are reachable from one another. A chevron next to the navbar's "Lists" link also reveals `/leaderboard` directly in a small click-to-open submenu, without needing to go through the Lists page first.
- **Searching within a list**: any list with more than 4 items gets a search box above its rows, filtering by item title, note, or (for a fight scene) its parent movie's title — client-side, since a list is capped at 200 items. Reordering still targets the item's real position in the full list even while filtered, since the search box narrows what's visible, not the list's actual order.

## Member Movie Submissions

`/movies/submit` lets a member search TMDB and submit a match directly — the same underlying TMDB import used by `/admin/import`, but scoped to one title at a time and requiring a verified email. Reachable two ways: a "+ Add Movie" link in the site nav (visible to everyone; signing in is only required to actually submit), or the "Can't find it? Add a movie" link shown on a zero-result search.

- **Submissions start `PENDING`**, not live: hidden from the homepage, search (including the navbar's), autocomplete director/actor filters, and the weekly-trending computation, and its own movie page 404s for everyone except the submitter and admins. This mirrors fight-scene verification's "member-created content, admin-gated visibility" pattern rather than admin imports' "goes live immediately" one, since anyone can trigger this path, not just a trusted admin.
- Submitting a `tmdbId` that's already in the catalog (approved or still pending) is rejected with a specific error rather than silently re-importing it — re-running the shared import logic on an existing row would otherwise reset an already-approved movie back to pending.
- Admins review submissions in a **Pending Submissions** section at the top of `/admin/movies` — Approve moves it to the catalog immediately; Reject permanently deletes it, same as deleting any other catalog entry.
- A successful submission shows a "View submission →" link straight to the new (still-pending) movie page, and the submitter's own profile lists everything they've got awaiting review in its own **Pending Submissions** section (visible only to them, same as Favorites/Watchlist), so there's somewhere to check status without waiting on an email.

## Fights

Below the cast list on every movie page, members can catalog individual fight scenes from that film:

- **Movie-page teaser**: only the newest scene renders on the movie page itself, as a single full-width spotlight card, fetched that way server-side rather than fetched-in-full-then-hidden — a movie with many scenes doesn't ship every scene's cast/tags/ratings to the browser just to show one of them. A "View all N fights" link below it leads to the full collection.
- **Collection page** (`/movies/[id]/fights`): every non-deleted scene for the movie, with the same grid, "Show more" pagination, and "+ Add fight scene" form as the movie page teaser used to have before it was capped — this page is simply where that full experience now lives.
- **Add a scene**: paste a YouTube URL (any watch/shorts/embed/`youtu.be`/live link, with an optional `t=`/`start=` timestamp used as the clip's initial start time), give it a title (the submitter can auto-fill from the video's public oEmbed title), tag which of the movie's own cast members are in it, and optionally attach up to 10 category tags. Requires a verified email.
- **Adjusting the start time**: only admins can set or change where a clip starts playing, via a "Start at" mm:ss control on each scene — no need to re-paste the YouTube link to retime it. A submitter's own edits (title, cast, tags, or even swapping the link) never touch the start time; it's admin-managed independently once the scene exists. Along with the editor rating/note, it's tucked behind an "Admin tools" toggle per card rather than always expanded, so an admin's own view of the movie page isn't cluttered with controls they're not currently using.
- **Round numbers** aren't stored — they're computed on read as the scene's position, by creation order, among that movie's non-deleted scenes. Delete scene 2 of 3 and the old scene 3 becomes Round 2 automatically.
- **Ratings**: members rate a scene 1–10 (one rating per member, editable); admins have a separate rating with an optional note, mirroring the movie-level Editors' Score.
- **Verification**: admins can mark a scene "Verified" as a quality signal. Editing a scene's content clears verification, since an admin's earlier check no longer vouches for what's there now.
- **Editing/deleting**: the submitter can edit or delete their own scene; admins can delete anyone's. Deletion is a soft-delete (like discussion posts) so ratings tied to a scene aren't orphaned.
- **Tags**: the tag list itself (e.g. "Weapon Duel", "One vs. Many") is admin-curated at `/admin/fight-scene-tags` — members choose from it but can't create new tags.
- **Permalinks**: each fight scene has its own page at `/movies/[id]/fights/[fightSceneId]` with dynamic Open Graph metadata (title, rating summary, YouTube thumbnail) for clean link previews when shared. Built as a standalone destination rather than just the same card lifted out of a movie page: a breadcrumb (movie → Fights → scene title, the middle crumb linking to the movie's Fights collection page) replaces the old back-link; the clip plays at full card width instead of the small inset used on the movie page and in search results; the round label reads "Round N of (total)" with prev/next arrows to step through the movie's other scenes in order; and the share menu adds a "Copy YouTube link" option alongside the app's own permalink, carrying the clip's start time via the same `t=` param the "watch on YouTube" overlay already uses. Below the scene, a quieter secondary zone (small muted labels, single-row scrolling, no room-filling cards — deliberately lower visual weight than the scene itself) surfaces the rest of the movie's cast as pills (highlighting whoever's tagged in this specific scene) and a "More Fights From This Movie" rail linking to the movie's other scenes — capped to the 8 closest by round number to the one you're watching, with a trailing "View all" card into the collection page once a movie has more than that.
- **Saving to a list**: any member can save a fight scene to one of their own custom lists, or one-tap Favorite it — see [Member Lists & Profiles](#member-lists--profiles).

## Fight Count

A **Fight Count** — a member-maintained "true" number of fights in the movie — shows up two places on a movie page: a plain "N fights" fact alongside runtime/director/country up top (grouped with the rest of the movie's info, not tucked away), which links down to the full editable control (value, Edit, and edit history) sitting directly above the Fights list. This is independent of the Fights listed below (an admin-verifiable, individually clipped/tagged catalog) — Fight Count is a simpler, single number for "how many fights does this movie actually have," which will often be higher than what's been individually cataloged, since not every fight gets clipped and tagged. There's no separate "N scenes cataloged" count shown — with submission volume this low per movie, that's easy enough to see at a glance in the list itself.

This is deliberately a single shared value, not an aggregate of individual member submissions like ratings are: any verified member can overwrite it directly, last edit wins, no consensus step. That simplicity trades away any built-in resistance to a bad-faith edit, so it's paired with guardrails rather than left unprotected:

- **Verified email required** — same bar as fight scene submission and movie submission. Admins/reviewers are exempt from this specific check (trusted like every other admin action), not from the feature generally.
- **Bounds-checked** (0–20) server-side, to block obviously-wrong values outright rather than relying on someone noticing later.
- **Rate-limited** per user through the same Upstash limiter used for other content-mutation endpoints.
- **Full edit history**, visible to everyone on the movie page (not just admins) — who changed it, from what value to what, and when. The value itself has no approval step, so this history is the only accountability trail; anyone can use it to spot and revert a bad edit, not just moderators.

See `DECISIONS.md` for the fuller reasoning, including the aggregation-based alternative (à la ratings) that was considered and explicitly rejected in favor of this simpler model.

## Fun Facts

Below Fights on every movie page: an IMDB "Did you know"-style trivia section. Any verified member can add a short fun fact (500 characters max — a trivia snippet, not a full discussion post), and any other verified member can vote it up or down.

- **Spotlight + collapsed list.** By default, only the single highest-voted fact shows, in a large "spotlight" card with prev/next arrows to cycle through every fact one at a time, vote buttons, and edit/delete controls for whoever can act on it — the same amount of space regardless of how many facts a movie has. The rest are hidden behind a "Show all N fun facts" toggle, which reveals a compact numbered list (entry number, both vote counts, submitter, date, full un-truncated text) paginated 5 per page with numbered page controls. This keeps the section's default footprint constant rather than growing with community activity.
- **Voting is thumbs up/down, not a 1–10 score** — the first bidirectional vote in the app (`MemberList` likes are one-directional). Voting the same direction again retracts your vote; voting the other direction switches it. You can't vote on your own fun fact. Both the spotlight and the list show thumbs-up and thumbs-down counts separately, not just a combined net score.
- **Ranked by net score** (upvotes minus downvotes), ties broken by newest first — the highest-voted facts rise to the top, same idea as IMDB's own trivia section.
- **Editing/deleting**: the submitter can edit or delete their own fact; admins can delete anyone's. Deletion is a soft-delete (keeps vote history intact) and the fact simply disappears from the list — unlike discussion posts, nothing else (no replies) depends on the row staying visible.
- Requires a verified email to submit or vote, same bar as fight scenes and discussion posts.
- **Mentions of this movie's own cast or franchise siblings auto-link**, no `@mention` syntax to type — writing "Bruce Lee" in a fact about *Enter the Dragon* links straight to his actor page, and mentioning another movie in the same collection links to it. Only matched against this movie's own cast list and its `collectionTmdbId` siblings (not the whole site's actor/movie tables), keeping false-positive risk low without needing an autocomplete input.

## Actor Pages

Every credited person has a page at `/actors/[personId]`. Linked from a movie's Cast section and from the "Featuring" line on a fight scene card — there's no dedicated actor search yet, so browsing there is the only way in for now.

Just under the actor's name, a **Details** card summarizes their career from data already gathered for the rest of the page — no extra queries: filmography size, total fight scenes tagged, average community rating across their filmography, and years active (earliest–latest release year among their movies). Same plain bordered dt/dd treatment as the movie page's Studio/Country box — these four are collection statistics (how much exists), not earned distinctions, so they intentionally don't get any tribute/achievement styling. Any stat without a value is simply omitted, and an actor with none of these stats gets no card at all.

Beside it, when the actor has shared at least 2 fight scenes with the same other actor, a separate **Sparring Partner** card links to whoever that co-star is. Kept as its own small card rather than folded into Details, since a linked name doesn't belong in a grid of quantitative stats; it's also the likely starting point for a fuller "collaboration" section down the road (see DECISIONS.md), not a finished design in itself. A tie at the top count is broken at random rather than silently, and the card discloses it ("5 shared fight scenes · tied with 1 other") instead of naming one co-star with no indication the pick wasn't clear-cut.

A real crowd-earned "achievement" treatment does exist further down this section — Signature Role/Signature Fight Scene, below — rather than duplicated here; see DECISIONS.md for the design conversation that led to keeping this card plain.

The page leads with **Known For** — up to 8 movies from the actor's filmography (excluding any still-pending submission), picked by TMDB popularity and shown as a horizontally-scrolling poster rail (`MovieRailTrack`, the same scrollable-rail mechanics as Cast/Reviews/You Might Also Like, factored out of `MovieRail` for reuse here). Below it, the full **Filmography** is a dense, text-forward list (poster thumbnail, title, character, year, community rating) rather than a second poster grid — some actors in this genre have well over a hundred credits, too many to browse as cards — with a type-to-filter box above it for jumping straight to a title. **Fights** (every fight scene the actor is tagged in across the catalog, sorted by most favorited) keeps its card grid, since a video thumbnail is the point there, but opens collapsed to the first 6 with a **"Show all N fight scenes →"** toggle and its own title filter, for the same long-tail reason.

Biography, birthday, and place of birth (when TMDB has them) fill the rest of that same row, live-fetched via their `person.tmdbId` on each page view rather than stored in our own database — if TMDB is unreachable or has nothing on record, that section is simply omitted. Sharing the row with the Details card (and Sparring Partner, when it's shown) leaves the biography a narrower column than it used to have, so it now clamps to 10 lines with its own **"Show more"/"Show less"** toggle once it's long enough to need one — the same clamp-with-toggle mechanics already used for member reviews and the homepage's Recent Reviews by Editors (see [Reviews](#reviews)), just with more room before the toggle kicks in, since a biography reads more like an article than a review.

Below Fights, every actor page also carries two member-content sections letting fans pay homage to the actor directly, not just to the movies they're in — **Tributes** and **Fun Facts**, `PersonTribute`/`PersonTributeVote` and `PersonFunFact`/`PersonFunFactVote` in the schema. Both reuse the same shapes, rules, and UI patterns as the equivalent movie-page features (see [Fun Facts](#fun-facts) and [Reviews](#reviews) above):

- **Tributes** — a longer-form (5,000 character max) writeup appreciating an actor's career or a specific performance, the more literal "homage" feature. One per (actor, member) pair, edited in place rather than posting a second one. Shown as a horizontally-scrolling rail capped to the top 2 by net vote score (same `rail-scrollbar` card pattern as member movie reviews), with a **"View all N tributes →"** link once there are more, leading to a dedicated `/actors/[personId]/tributes` page listing every tribute in full, 10 per page. The author can edit or delete their own; admins can delete anyone's (hard-deleted — nothing else references a tribute).
- **Fun Facts** — a short (500 character max) trivia snippet about the actor, same spotlight-card-plus-collapsed-list UI as movie Fun Facts, ranked by net vote score. The submitter can edit or delete their own; admins can delete anyone's (soft-deleted, keeping vote history intact). Unlike movie Fun Facts, actor fun facts don't auto-link mentions of other cast/movies — there's no small, per-actor-bounded pool of names to safely match against the way a single movie's own cast list provides one.
- **Voting** on both is thumbs up/down, toggling the same way as their movie counterparts (voting the same direction again retracts it, the opposite direction switches it) — you can't vote on your own tribute or fun fact.
- Both require a verified email to submit or vote, same bar as every other member-content feature.

A lighter-weight **Favorite** rounds out the actor page — a one-tap heart toggle next to the actor's name (`PersonFavorite` in the schema), same pattern as favoriting a fight scene. Requires a verified email, same bar as the content features above. Favorite counts feed the **Most Beloved Actors** ranking on `/leaderboard` — see [Member Lists & Profiles](#member-lists--profiles).

Members also crowd-vote on the actor's **Signature Role** and **Signature Fight Scene** — two independent answers to "what should this actor be remembered for," cast as a 🏆 toggle on a Known For poster, a Filmography row, or a Fights card (`PersonSignatureVote` in the schema — one movie pick and one fight-scene pick per member per actor, held at the same time rather than competing with each other). A movie's toggle stays in sync wherever it appears — Known For and Filmography share the same underlying vote state, so voting from either place updates both. Whichever movie has the most votes among movie picks, and whichever fight scene has the most among fight-scene picks, each appear as their own spotlight banner near the top of the page — side by side when both clear the threshold, either alone if only one has. Each banner stays hidden until its own category reaches at least 5 votes for that actor, so neither crowns a "leader" off a couple of clicks. Voting toggles the same way as Favorite/Fun Facts (voting your current pick again retracts it; voting a different credit within the same category switches to it) and requires a verified email, same bar as the rest of the page.

Known For's popularity ranking and the Signature Vote banners are deliberately independent signals and won't always agree — Known For reflects TMDB's general popularity data, while Signature Vote is this site's own members answering "what defines this actor," which can land on a different, less mainstream credit.

## Reviews

Shown alongside the cast list on every movie page: an admin review (unchanged from the original "Editorial Reviews" feature) plus one review per verified member, both in the same section.

- **Admin review** — long-form, up to 10,000 characters. There's one per movie — any admin can write or update it, and the page just tracks who last touched it. Always displayed first, in its own bordered box labeled **Admin Review** to distinguish it from member reviews.
- **Member reviews** — up to 5,000 characters, one per (movie, member) pair — a member can have at most one review per movie, and edits it in place rather than posting a second one. The movie page shows only the top 2 (by net vote score, ties broken by newest) as a horizontally-scrolling rail of cards — the same `rail-scrollbar` pattern used for Cast and You Might Also Like — each card clamping long text to 4 lines with its own "Show more"/"Show less" toggle. A **"View all N reviews →"** link appears once there are more than 2, leading to a dedicated `/movies/[id]/reviews` page listing every review in full (unclamped), 10 per page. The submitter can edit or delete their own from either place; admins can delete anyone's (hard-deleted, not soft-deleted — unlike Fun Facts, nothing else references a review, so there's no vote history or thread to preserve). Requires a verified email to write one, same bar as fight scenes, discussion, and fun facts.
- **Voting** — signed-in members can upvote or downvote any member review but their own (mirroring Fun Fact voting: voting the same direction again retracts it, the opposite direction switches it), which determines the sort order described above.
- Admins can also write their own member review in addition to the shared admin review — the two aren't mutually exclusive.

The homepage's **Recent Reviews by Editors** section is unaffected by this — it still surfaces only the 5 most recently written-or-edited *admin* reviews (an admin revising an older review counts, not just brand-new ones) as a two-column grid of compact cards — poster thumbnail, title, reviewer, date, and the review's full text clamped to 3 lines with a "Show more" toggle once it's long enough to need one, rather than a short teaser excerpt.

## You Might Also Like

Every movie page shows a "You Might Also Like" rail (same scrollable card-rail component the homepage uses) of up to 8 similar movies from this catalog — deliberately **not** TMDB's own `/movie/{id}/recommendations` or `/similar` endpoints, which reflect TMDB's general-audience similarity rather than this catalog's data or genre focus.

Similarity is a weighted blend of three signals, all sourced from data already in the catalog: shared genres (lightest weight — in a catalog this genre-homogeneous, almost every movie shares one), shared cast or director (heavier — a specific, personal signal), and same TMDB franchise/collection (heaviest — two entries in the same series are the strongest possible "you'll like this too" signal; see [TMDB Import](#tmdb-import) below). Candidates are scored and ranked in `getSimilarMovies` (`src/lib/similar-movies.ts`); a movie with none of these three signals in common with anything else in the catalog simply doesn't get a rail at all, rather than showing an empty section.
## Admin Recommendations

Any admin can mark a movie as one of their personal recommendations from the movie's detail page — a "+ Recommend this movie" toggle sits in the same tap-menu as the poster's Replace/Remove poster controls (tap the poster to open it). Each admin's recommendation is independent: a movie can carry zero, one, or both admins' picks at once, and each shows as its own badge (a colored circle with the admin's initial — a placeholder until real per-admin icon images are provided) next to the movie's runtime/director byline and on the movie's card everywhere it appears in search/browse grids.

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
- **Fight Scene Tags** (`/admin/fight-scene-tags`) &mdash; manage the category vocabulary members tag fight scenes with (see [Fights](#fights) above). Open to `REVIEWER`.
- **News & Updates** (`/admin/news`, `ADMIN`-only) &mdash; publish, edit, or delete posts shown on the homepage and the `/news` archive (see [News & Updates](#news--updates) above).
- **Account** (`/admin/account`) &mdash; change your own sign-in email or password (previously only possible via direct SQL), or sign out of every device on your account (including the current one) without changing anything, if you suspect someone else has access. Changing your email re-triggers the normal email-verification flow on the new address; changing your password requires your current one (unless you signed up via Google and have never set one, in which case you can set an initial password). Any of the three signs you out immediately, since the session is JWT-based and won't otherwise pick up the change until you sign back in. Open to `REVIEWER` too — self-managing your own credentials isn't a content-moderation power, so it follows the same "reach `/admin` at all" gate as the dashboard itself.

Outside this dashboard, fight scene verification (the Verify/Unverify link on a fight scene card) is also open to `REVIEWER`, gated by its own `canVerify` prop on `FightSceneSection` — deliberately not the same prop as the component's `isAdmin`, which still gates a scene's Editors' rating/note, start-time adjustment, and delete-any-scene, none of which `REVIEWER` has. Editors' Score, editorial reviews, poster overrides, and discussion moderation are `ADMIN`-only actions that stay inline on the regular movie page.

There's no user-management UI for granting `REVIEWER`/`ADMIN` — promoting an account is a direct `UPDATE "User" SET role = 'REVIEWER' WHERE email = '...'` against the database, same as `ADMIN` always has been. A reasonable next step if the admin area grows further.

## Weekly Trending Carousel

`/api/cron/weekly-featured` recomputes the top 5 most-active movies (by ratings + discussion activity in the last 7 days) and is protected by the `CRON_SECRET` env var (sent as `Authorization: Bearer <CRON_SECRET>`). `vercel.json` schedules this to run weekly via [Vercel Cron](https://vercel.com/docs/cron-jobs) — Vercel automatically attaches that header when `CRON_SECRET` is set as a project environment variable.

Each slide prefers a fight scene clip over the static TMDB backdrop:

- **Which scene**: for each featured movie, the highest member-rated verified fight scene is chosen, falling back to highest editor-rated, then earliest-tagged. Unverified scenes are never selected.
- **Which moment**: the clip starts at the scene's tagged `youtubeStartSeconds` (see [Fights](#fights) below) rather than the beginning of the source video, capped to a 15-second window — matched to the carousel's rotation interval so a slide's clip finishes once before it advances.
- **Playback**: muted, looping, no player controls, starts immediately when its slide becomes active.
- **Accessibility**: never plays for visitors with `prefers-reduced-motion` set — they always see the static backdrop.
- **Fallback**: a movie with no verified fight scene keeps the static backdrop unchanged.
- **Bounded autoplay**: clips only autoplay for up to 5 laps through the carousel (`MAX_AUTOPLAY_LAPS` in `hero-carousel.tsx`) and pause entirely while the browser tab is hidden. An idle tab left open would otherwise keep mounting a fresh autoplaying YouTube embed every rotation indefinitely, an unattended-playback pattern that can get a visitor's session shown YouTube's "Sign in to confirm you're not a bot" interstitial in place of the clip. Manually clicking through slides doesn't count against the lap cap. The lap count is a judgment call, not a measured-safe number — YouTube doesn't publish a threshold for this.

## Security

- **Headers**: `next.config.ts`'s `headers()` sets `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Strict-Transport-Security` on every response (pages and API routes alike). `src/proxy.ts` separately sets a nonce-based `Content-Security-Policy` — `script-src` uses a per-request nonce plus `'strict-dynamic'` rather than a static allowlist, following [Next.js's documented CSP pattern](https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy), so Next's own injected scripts work without `'unsafe-inline'`. `'unsafe-eval'` is added to `script-src` in development only (Turbopack's dev server/React Refresh needs it; production builds don't). `img-src`/`frame-src` explicitly allowlist the external hosts the app actually embeds: `image.tmdb.org`, `*.public.blob.vercel-storage.com`, `img.youtube.com`, and `youtube-nocookie.com`.
  - Locally, expect one harmless console warning about `/_vercel/insights/script.js` returning the wrong MIME type — that path is only handled specially by Vercel's actual platform; `next dev`/`next start` don't serve it, so Web Analytics is a documented no-op outside a real Vercel deployment. Not a CSP misconfiguration.
  - Running `next start` locally (not `next dev`) also needs `AUTH_TRUST_HOST=true` in your `.env` — Auth.js v5 is stricter about validating the request host outside development mode.
- **Dependencies**: `npm audit` is expected to report 0 vulnerabilities; re-run `npm audit fix` (and bump `next`/`prisma` directly if a fix needs a version not covered by their `^` range) if a future dependency update reintroduces any.
- **Rate limiting**: `src/lib/rate-limit.ts` throttles the endpoints most worth throttling — login (5 attempts / 5 min, keyed by email), registration and forgot-password (5 / 10 min, keyed by IP), resend-verification (3 / hour, keyed by user), and the content-creation endpoints (discussion posts, fight scene submissions, movie submissions, list creation — 10-20 / 10 min, keyed by user). Login failures caused by rate limiting look identical to a wrong password (a generic `CredentialsSignin` error) so the limiter doesn't leak its own state to an attacker. Backed by [Upstash Redis](https://upstash.com) via `@upstash/ratelimit`, so limits are enforced correctly across serverless instances rather than reset per cold start. Without `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` configured, rate limiting is a no-op — every request is allowed, not blocked — so local dev and CI work unchanged. To enable it, create a free database at [console.upstash.com](https://console.upstash.com), copy its REST URL/token into `.env`, and restart the dev server.
- **CAPTCHA**: registration and forgot-password both render a [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/) widget and verify the token server-side, guarding the two flows most attractive to automated bulk abuse (mass account creation, mass password-reset email spam). Not added to login — that's already covered by the per-email rate limit above, and a CAPTCHA on every mistyped password would just be friction for legitimate members. Without `NEXT_PUBLIC_TURNSTILE_SITE_KEY`/`TURNSTILE_SECRET_KEY` configured, no widget renders and no verification is required — local dev and CI work unchanged. To enable it, create a free widget at [the Cloudflare dashboard](https://dash.cloudflare.com/?to=/:account/turnstile) and copy its site key/secret key into `.env`.
- **Password requirements**: `src/lib/password.ts`'s `validateNewPassword()` — shared by registration, admin password change, and forgot-password reset so the rules can't drift between them — requires at least 12 characters (bumped from 8; current guidance favors length over composition rules like forced symbols/numbers, which mostly just push people toward predictable patterns) and caps it at 72 bytes (bcrypt silently truncates past that, so a longer password past this point isn't actually adding strength — capping it makes that real limit explicit instead of a silent surprise). Hashed with bcrypt at cost factor 12 (OWASP's current recommended minimum, bumped from 10).
- Registration intentionally still reveals whether an email is already registered (`"An account with that email already exists"`) rather than a generic response — closing that fully would mean dropping the instant sign-in that currently happens right after registration, for everyone, to guard against a risk (bulk email harvesting) that CAPTCHA above already covers. See `DECISIONS.md` for the full reasoning.
- **Session invalidation on password change**: sessions use Auth.js's JWT strategy, which by default keeps a session valid purely from its cookie's signature — a password reset wouldn't otherwise revoke sessions that already exist elsewhere (a different device, a stolen cookie). `auth.ts`'s `jwt` callback compares the account's `User.passwordChangedAt` against the value baked into the session at sign-in on every request, and signs the session out the moment they no longer match. This is what makes forgot-password (and an admin's own password change) actually lock out anyone else who was already signed in, not just change the password going forward. One side effect: shipping this signs every currently-active session out once (a session issued before this check existed has no baseline to compare, so it's always treated as stale) — a one-time, harmless global sign-out, not a bug.
- **Manual "sign out everywhere"**: `/admin/account`'s Sessions section lets `ADMIN`/`REVIEWER` accounts trigger the same invalidation above on demand, without changing their password — `POST /api/admin/account/sign-out-everywhere` just bumps `User.passwordChangedAt`. Useful if you suspect another session is compromised but don't want to (or can't yet) pick a new password. Signs out every session on the account, including the one that clicked the button.
- **Password manager support**: every password/email/username input in the app sets the matching `autoComplete` attribute (`current-password`, `new-password`, `email`, `username`) so browsers and password managers can correctly offer to save/fill credentials and generate strong passwords — missing these previously produced a genuine dev-console warning and made it easier to end up typing a weak password by hand instead.
- **Poster upload validation**: `admin/movies/[id]/poster` sniffs the uploaded file's actual signature ("magic bytes") rather than trusting the browser-reported `Content-Type`/`File.type`, which a client fully controls independent of what bytes it actually sends. A file that doesn't match a real JPEG/PNG/WebP signature is rejected outright, and the sniffed type (not the client-declared one) is what gets stored as the blob's `Content-Type`.
- **Login timing side-channel closed**: `authorize()` in `auth.ts` always runs `bcrypt.compare()`, even when the submitted email has no matching account, comparing against a fixed dummy hash in that case instead of skipping the (deliberately slow) comparison. Without this, a nonexistent account returned fast (a DB lookup only) while a wrong password on a real account returned slow (DB lookup plus a real bcrypt compare) — a timing gap that let an attacker distinguish the two by response time alone, even though both cases already return the identical generic `CredentialsSignin` error text.

## Continuous Integration

`.github/workflows/ci.yml` runs `npm run lint` and `npm run build` on every push and pull request. It needs no database or secrets — the app has no statically-generated pages that touch Prisma at build time, so `next build` succeeds without a live connection, and `npm ci` regenerates the Prisma client automatically via a `postinstall` hook. This is a real constraint, not an accident — see [Error Monitoring](#error-monitoring)'s note on why Sentry's `next.config.ts` build wrapper was deliberately skipped to preserve it.

`.github/workflows/vercel-preview-cleanup.yml` deletes a PR's Vercel preview deployment(s) as soon as the PR closes (merged or not). This matters because of how Vercel's Neon integration works: a preview database branch is only deleted when its *last associated Vercel deployment* is deleted, not when the PR closes or the git branch is removed — left alone, Vercel's own deployment retention policy eventually does this automatically, but only after up to ~180 days by default. With many parallel PRs landing regularly (see [Stay in sync with master before building](#keep-readmemd-in-sync) workflow in `CLAUDE.md`), that's long enough for Neon's Free-plan 10-branch-per-project cap to be hit well before natural cleanup catches up, failing new preview deployments outright until branches are freed manually. This workflow closes that gap immediately instead. Needs `VERCEL_TOKEN`, `VERCEL_PROJECT_ID`, and (if the Vercel project is under a team, not a personal account) `VERCEL_ORG_ID` as repo secrets — find/generate a token at Vercel's [Account Settings → Tokens](https://vercel.com/account/tokens), and the project/org IDs on the Vercel project's Settings → General page. Without `VERCEL_TOKEN`/`VERCEL_PROJECT_ID` configured, the workflow no-ops with a warning rather than failing the PR.

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

## Community Activity

A "Community Activity" section at the very bottom of the homepage, below
Recent Reviews by Editors, surfaces recent member-generated events
from three existing tables with no new schema — a fight scene tagged, a
custom list created, or a discussion thread started (top-level posts
only — a reply doesn't count as starting a new one). Shown as three
columns, one per event type (the 3 most recent of each), rather than one
merged list, so a burst of activity in one type can't crowd the other two
out of view. Movie-linked rows (fight scenes, discussions) show a poster
thumbnail, matching Recent Reviews by Editors' card layout. Each row links
through to the relevant movie, list, or discussion, plus the member's
profile. Same visibility rule as every other public listing: an event tied
to a still-pending (not yet admin-approved) movie stays out of the feed
until the movie is approved.

## Web Analytics

[Vercel Web Analytics](https://vercel.com/docs/analytics) is wired up via the `<Analytics />` component from `@vercel/analytics/next` in the root layout — it tracks page views once deployed, no cookies/consent banner needed (Vercel's Web Analytics is cookieless).

It needs to be turned on per-project after deploying: **Vercel dashboard → this project → Analytics tab → Enable**. Until enabled there, the component is a no-op — nothing to configure locally, and no `.env` variable involved.

## Error Monitoring

Server-side errors were always visible in Vercel's function logs (everything already goes through `console.error`), but a client-side crash — a React render error, an uncaught browser exception — had no visibility beyond whoever happened to have their browser console open. [Sentry](https://sentry.io) closes that gap:

- **`src/instrumentation-client.ts`** initializes Sentry in the browser and reports uncaught client errors, gated on `NEXT_PUBLIC_SENTRY_DSN`.
- **`src/instrumentation.ts`** does the server/edge equivalent via Next's native `onRequestError` hook, gated on `SENTRY_DSN`.
- **`src/app/error.tsx`** is a route-level error boundary — instead of a broken page on a render crash, members see a friendly "Something went wrong" screen with a retry button, and the error is reported to Sentry (if configured) on top of the existing `console.error`.

Like every other optional integration in this app, this fails open: without `SENTRY_DSN`/`NEXT_PUBLIC_SENTRY_DSN` set, Sentry is never initialized and nothing about local dev, CI, or the app's own behavior changes. To enable it, create a free project at [sentry.io](https://sentry.io) and put the same DSN in both env vars (Sentry DSNs aren't secret — safe to expose to the browser).

**Known limitation**: `next.config.ts` is deliberately *not* wrapped with Sentry's `withSentryConfig` (which most Sentry setup guides lead with). That wrapper uploads source maps at build time and needs a `SENTRY_AUTH_TOKEN` — making it a build-time dependency would break the guarantee in [Continuous Integration](#continuous-integration) that `npm run build` needs no secrets, for every contributor and every parallel PR, not just this feature. The tradeoff: Sentry will show real stack traces, just against the deployed (minified/bundled) JavaScript rather than your original source. Revisit if/when readable production stack traces are worth wiring `SENTRY_AUTH_TOKEN` into CI as a real secret.

**EU-region Sentry orgs**: `src/proxy.ts`'s CSP `connect-src` allowlists `*.ingest.us.sentry.io`. A Sentry org created in the EU region needs `*.ingest.eu.sentry.io` there instead, or client-side error reports are silently CSP-blocked.

## Project Structure

- `src/app` — pages and API routes (App Router), including the `/admin` dashboard and its sub-pages (see [Admin Area & Roles](#admin-area--roles)), the fight scene permalink route (`/movies/[id]/fights/[fightSceneId]`), member movie submission (`/movies/submit`), member profiles (`/members/[username]`), public list permalinks (`/lists/[listId]`), and actor pages (`/actors/[personId]`)
- `src/components` — UI components (`fight-scene-section.tsx`, `editorial-review.tsx`, `poster-override-control.tsx`, `share-button.tsx`, `member-list-manager.tsx`, `add-to-list-control.tsx`, etc.)
- `src/lib` — Prisma client, Auth.js config, TMDB client, YouTube URL parsing, rating/weekly-featured/verification/fight-scene/username/member-list helpers, email sender
- `prisma/schema.prisma` — data model
- `prisma/seed.ts` — sample/dev seed data, including a sample fight scene and editorial review

## Out of Scope (for now)

Person/actor detail pages, catalog-wide pagination, reply notifications, a user-facing "report post" flow, "related movies" recommendations, and fight scene moderation beyond owner/admin delete are not yet implemented.
