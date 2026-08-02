# Kung Fu Movie Database

An IMDB-style website for kung fu and martial arts films, built for martial arts movie enthusiasts. Movie data is sourced from [TMDB](https://www.themoviedb.org/).

## Features

- Landing page with a weekly-rotating "trending" carousel (top 5 most-active movies over the last 7 days) and a recently-added grid
- Search by movie title or actor name
- Movie pages with cast, synopsis, a community rating, a separate admin-only "Editors' Score", an admin-authored editorial review, and a per-movie discussion thread (with spoiler tags, edit/delete on your own posts, and admin moderation)
- **Fight Scenes**: members tag specific fight scenes within a movie — YouTube clip (with an optional start timestamp), the actors involved (picked from that movie's cast), and category tags (e.g. "Weapon Duel", "One vs. Many") — with their own member rating, a separate admin rating, admin verification, and a shareable permalink page (see [Fight Scenes](#fight-scenes) below)
- Member accounts via email/password (with email verification) or Google sign-in
- Member capabilities: rate movies and fight scenes, maintain a Favorites list and a Watchlist, post/reply in movie discussions, submit fight scenes
- Admin capabilities: TMDB import tool (`/admin/import`), Editors' Score, editorial reviews, fight scene verification, fight scene tag management (`/admin/fight-scene-tags`), poster overrides
- Social sharing (native share sheet on mobile, copy-link/X/Facebook/Reddit fallback on desktop) on movie and fight scene pages

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

The seed script creates a few placeholder movies (clearly not real TMDB imports) so the site is browsable immediately, plus two pre-verified test accounts:

- `admin@example.com` / `admin1234` (role: ADMIN)
- `member@example.com` / `member1234` (role: USER)

### 7. Run the app

```bash
npm run dev
```

Visit `http://localhost:3000`. Sign in as the admin account and use `/admin/import` to search TMDB and pull in real kung fu films (there's no single "kung fu" genre on TMDB, so curation is admin-driven by design — search titles like "Ip Man", "Drunken Master", "Once Upon a Time in China", etc.).

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

## Fight Scenes

Below the cast list on every movie page, members can catalog individual fight scenes from that film:

- **Add a scene**: paste a YouTube URL (any watch/shorts/embed/`youtu.be`/live link, with an optional `t=`/`start=` timestamp), give it a title (the submitter can auto-fill from the video's public oEmbed title), tag which of the movie's own cast members are in it, and optionally attach up to 10 category tags. Requires a verified email.
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

## Weekly Trending Carousel

`/api/cron/weekly-featured` recomputes the top 5 most-active movies (by ratings + discussion activity in the last 7 days) and is protected by the `CRON_SECRET` env var (sent as `Authorization: Bearer <CRON_SECRET>`). `vercel.json` schedules this to run weekly via [Vercel Cron](https://vercel.com/docs/cron-jobs) — Vercel automatically attaches that header when `CRON_SECRET` is set as a project environment variable.

## Continuous Integration

`.github/workflows/ci.yml` runs `npm run lint` and `npm run build` on every push and pull request. It needs no database or secrets — the app has no statically-generated pages that touch Prisma at build time, so `next build` succeeds without a live connection, and `npm ci` regenerates the Prisma client automatically via a `postinstall` hook.

## Deploying

1. Push this repo to GitHub and import it into [Vercel](https://vercel.com/new).
2. Set the environment variables from `.env.example` in the Vercel project settings (use a hosted Postgres connection string).
3. Run `npx prisma migrate deploy` against the production database (Vercel's build step, or manually).
4. Update the Google OAuth redirect URI to your production domain.

## Project Structure

- `src/app` — pages and API routes (App Router), including admin pages (`/admin/import`, `/admin/fight-scene-tags`) and the fight scene permalink route (`/movies/[id]/fight-scenes/[fightSceneId]`)
- `src/components` — UI components (`fight-scene-section.tsx`, `editorial-review.tsx`, `poster-override-control.tsx`, `share-button.tsx`, etc.)
- `src/lib` — Prisma client, Auth.js config, TMDB client, YouTube URL parsing, rating/weekly-featured/verification/fight-scene helpers, email sender
- `prisma/schema.prisma` — data model
- `prisma/seed.ts` — sample/dev seed data, including a sample fight scene and editorial review

## Out of Scope (for now)

Person/actor detail pages, catalog-wide pagination, rate limiting, reply notifications, a user-facing "report post" flow, "related movies" recommendations, and fight scene moderation beyond owner/admin delete are not yet implemented.
