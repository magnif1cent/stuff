# Kung Fu Movie Database

An IMDB-style website for kung fu and martial arts films, built for martial arts movie enthusiasts. Movie data is sourced from [TMDB](https://www.themoviedb.org/).

## Features

- Landing page with a weekly-rotating "trending" carousel (top 5 most-active movies over the last 7 days) and a recently-added grid
- Search by movie title or actor name
- Movie pages with cast, synopsis, a community rating, a separate admin-only "Editors' Score", and a per-movie discussion thread
- Member accounts via email/password or Google sign-in
- Member capabilities: rate movies, maintain a Favorites list and a Watchlist, post/reply in movie discussions
- Admin-only TMDB import tool to curate the catalog (`/admin/import`)

## Tech Stack

- [Next.js](https://nextjs.org/) (App Router) + TypeScript + Tailwind CSS
- [Prisma ORM](https://www.prisma.io/) 7 + PostgreSQL (via the `@prisma/adapter-pg` driver adapter)
- [Auth.js (NextAuth) v5](https://authjs.dev/) — Credentials (email/password) + Google OAuth
- [TMDB API](https://developer.themoviedb.org/docs) for movie/person data

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

Fill in `DATABASE_URL`, `TMDB_API_KEY`, `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`, and generate an `AUTH_SECRET`:

```bash
npx auth secret
```

### 6. Apply the database schema and seed sample data

```bash
npx prisma migrate dev
npx prisma db seed
```

The seed script creates a few placeholder movies (clearly not real TMDB imports) so the site is browsable immediately, plus two test accounts:

- `admin@example.com` / `admin1234` (role: ADMIN)
- `member@example.com` / `member1234` (role: USER)

### 7. Run the app

```bash
npm run dev
```

Visit `http://localhost:3000`. Sign in as the admin account and use `/admin/import` to search TMDB and pull in real kung fu films (there's no single "kung fu" genre on TMDB, so curation is admin-driven by design — search titles like "Ip Man", "Drunken Master", "Once Upon a Time in China", etc.).

## Weekly Trending Carousel

`/api/cron/weekly-featured` recomputes the top 5 most-active movies (by ratings + discussion activity in the last 7 days) and is protected by the `CRON_SECRET` env var (sent as `Authorization: Bearer <CRON_SECRET>`). `vercel.json` schedules this to run weekly via [Vercel Cron](https://vercel.com/docs/cron-jobs) — Vercel automatically attaches that header when `CRON_SECRET` is set as a project environment variable.

## Deploying

1. Push this repo to GitHub and import it into [Vercel](https://vercel.com/new).
2. Set the environment variables from `.env.example` in the Vercel project settings (use a hosted Postgres connection string).
3. Run `npx prisma migrate deploy` against the production database (Vercel's build step, or manually).
4. Update the Google OAuth redirect URI to your production domain.

## Project Structure

- `src/app` — pages and API routes (App Router)
- `src/components` — UI components
- `src/lib` — Prisma client, Auth.js config, TMDB client, rating/weekly-featured helpers
- `prisma/schema.prisma` — data model
- `prisma/seed.ts` — sample/dev seed data

## Out of Scope (for now)

Person/actor detail pages, catalog pagination, discussion moderation tools, notifications, and "related movies" recommendations are not yet implemented.
