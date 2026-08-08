# Decisions Log

The working memory this project's `README.md` doesn't carry. `README.md` documents
*how the app works today* — this documents *why it works that way*, and what's
still open. Update this file when a decision is made or a direction changes,
not on every merge; it's not a changelog (`git log` already is one).

Two tiers:

- **Foundational Changes** — architecture/stack-level milestones: a new
  subsystem, a schema-shaping decision, a process convention. Chronological,
  oldest first, since it reads as the project's evolution.
- **Feature Decisions** — narrower implementation choices within an existing
  feature: which of several options was picked, and why. Newest first.

Not every PR needs an entry — only ones with a real judgment call (alternatives
considered, an explicit reversal, a deferred scope) belong here. A pure bug fix
or a mechanical refactor doesn't.

## Foundational Changes

### MVP stack established
**PR #3.** Next.js 16 (App Router) + TypeScript + Tailwind, Prisma 7 +
PostgreSQL, Auth.js v5 (credentials + Google OAuth), TMDB as the movie data
source. TMDB has no single "kung fu" genre, so the catalog is built by
admin-driven curation (search-and-import) rather than an automated genre
filter — a deliberate scope choice, not a missing feature.

### Fight Scenes introduced as a core feature
**PR #4.** `FightScene`/`FightSceneCast`/`FightSceneRating`/`FightSceneAdminRating`
mirror the existing `Movie`/`CastCredit`/`Rating`/`AdminRating` shapes rather
than inventing a new modeling pattern. YouTube links are parsed server-side
into a normalized `videoId` + optional start time up front — a clean key kept
available for features not yet designed at the time (later used by the hero
clip preview and the admin start-time control).

### Cross-conversation process conventions established
**PR #9.** `CLAUDE.md` added so every future session working this repo (many
run in parallel, each usually on its own branch/PR) knows to keep `README.md`
in sync in the same PR as a feature change, and follows shared rules for
Prisma schema conflicts and the soft-delete pattern. A PR template checklist
added as a visible backstop at review time.

### Poster House visual identity adopted
**PR #7.** Site-wide palette remap via a single Tailwind `@theme` token
override in `globals.css`, so the look changes everywhere those tokens are
used without per-component edits. The Fight Ticket card is a deliberate
exception — kept visually distinct (cream/ink ticket-stub styling) from the
rest of the dark theme because it's the app's differentiator feature. A
competing `--accent` token approach built independently on a parallel branch
was dropped in favor of this one when the branches were later merged (PR
#11) — there's only ever been one theming system in the codebase, not two
reconciled after the fact.

### Admin area consolidated under one guard
**PR #10.** Two admin pages had grown independently with no shared nav, each
re-implementing its own access check, and two common actions (delete a movie,
change an admin's own credentials) had no UI at all. Replaced with a single
`/admin` dashboard guarded once by `requireAdminSession()` in a shared layout.

### Typo-tolerant search added via Postgres trigram extension
**PR #11/#12.** Fuzzy "did you mean" search fallback depends on `pg_trgm`,
a Postgres extension enabled via migration. This is an infrastructure
dependency, not just a query change — some hosted Postgres providers require
enabling extensions through their dashboard rather than letting a migration
do it, which is why it's called out in `README.md`'s setup steps.

### "Stay in sync with master" convention added
**PR #13.** Parallel sessions merging into `master` while another session is
mid-flight was causing stale-base surprises. `CLAUDE.md` updated to require
fetching and diffing against `master` at the start of new work and again
before merging, not before every intermediate build.

### Member identity and content model expanded
**PR #15/#16.** Members gained public usernames (replacing a free-text real
name field that was leaking real names publicly), member-created public
lists with a profile page at `/members/[username]`, and member movie
submissions with admin approval (`Movie.status`/`submittedById`). Lists were
made public by explicit design — deliberate groundwork for cross-member list
browsing later without another schema change, not an oversight. Submitted
movies start `PENDING` and stay invisible on *every* public discovery
surface until approved — homepage, search (including the fuzzy fallback),
navbar typeahead, autocomplete filters, weekly-trending, and any public list
they've been added to — not just the movie's own page, since a partial gate
would leak a pending title through a side door. Re-submitting a `tmdbId`
already in the catalog (approved or still pending) is rejected outright
rather than silently re-run through the shared import, since that import
always applies whatever status it's given — without the guard, "submitting"
an already-live movie again would demote it back to pending and pull it off
the site.

## Feature Decisions

### Recent Editor's Reviews shows full review text, clamped, not a short excerpt
**PR #23.** Requested alongside a News & Updates feature (not yet
built); this piece was built first since it needed no schema change —
`EditorialReview` already had everything required. *Considered:* a
short excerpt (first N characters) — rejected in favor of showing the
full review with a CSS `line-clamp-3` + "Show more" toggle, the same
clamp pattern the hero carousel already uses for movie overviews, so
visitors get the actual content instead of a teaser that requires a
click to find out if it's relevant. Ships as a two-column grid of
compact stacked cards (poster+meta on top, review below) rather than a
single-column list — narrower cards read better with poster and text
side by side dropped in favor of a stacked layout, and card height is
left variable by actual content rather than padded to a uniform grid
row, matching how Rotten Tomatoes' own review-snippet grids work.
Chosen as a text-forward feed over reusing `MovieRail`: a bare poster
tile doesn't communicate *why* a movie is in the list the way an
excerpt does. Filtered to `status: "APPROVED"` movies, matching the
pending-submission visibility
gate established in PR #16.

### Build version footer: commit SHA, not semantic versioning
**PR #22.** A visible "which deploy is this" indicator was worth adding
after this project's own Vercel-duplicate-project confusion earlier
(different preview URLs looked interchangeable). Chose the short git commit
SHA read from Vercel's built-in `VERCEL_GIT_COMMIT_SHA`/`VERCEL_ENV` env
vars over a `v1.2.3`-style version number — semantic versioning needs a
manual tagging/release discipline this project doesn't have anywhere else
(continuous merges to `master`, no release process), while the commit SHA
is accurate for free and directly answers the question that caused the
original confusion.

### Fight scene start time is admin-only, decoupled from submitter edits
**PR #20.** Members often add clips without a timestamp, and the only fix
used to be re-pasting a whole new YouTube link. A submitter's own edits
(title, cast, tags, link swap) no longer touch `youtubeStartSeconds` at all,
so an admin's retiming can't be silently clobbered by an unrelated edit
later. *Considered:* letting any submitter adjust their own scene's start
time — rejected per explicit direction that only admins should control it.

### Movie rail scrollbar: themed, not hidden
**PR #14.** A Netflix-style hidden scrollbar (arrows + fade only) was the
safer default, but a thin dark-themed bar was chosen instead to keep a
persistent position indicator for desktop/trackpad users, layered inside
`@layer utilities` after an earlier bug taught us unlayered CSS silently
wins over Tailwind.

### Rating filters: star-click picker over stepper or number input
**PR #12.** User tested all three in preview and picked the star picker
outright — "easy to select, less clicks than stepper." *Considered and
rejected in order:* 4 fixed presets → free-typed number input → +/− stepper.

### Director/actor filters: autocomplete over a full dropdown
**PR #12.** A `<select>` of every director/actor doesn't scale once the
catalog's people grow into the thousands. Debounced autocomplete against a
capped API endpoint instead.

### Fight scenes get their own search page, not folded into movie search
**PR #12.** A fight-scene result *is* the scene itself, not "a movie that
happens to contain one" — different filters (tags, scene rating), different
card, different intent.

### Filter layout: vertical sidebar over horizontal bar
**PR #12.** A horizontal filter bar wraps awkwardly once the fight-scene tag
list grows past a handful of entries. Vertical sidebar scales with volume
instead of breaking layout.

### One canonical Vercel project, two duplicates deleted
**Cleanup, no PR.** Three Vercel projects existed for the same repo from
accidental re-imports, causing "why don't I see my changes" confusion. Kept
`stuff` (name matches the repo, tracks `master`, real Neon connection);
deleted the broken one and the auto-suffixed duplicate.

### Reverted a migration rename rather than "fixing" ordering on a live database
**PR #18.** A migration was renamed to fix its sort order relative to a
dependency, which broke this PR's own preview — Vercel's Build Command runs
`prisma migrate deploy` against the same Neon database on every deploy, and
that database had already applied the migration under its original name.
Reverted the rename rather than force the live database to match a "cleaner"
history. The real ordering issue only bites a from-scratch database (new
local setup, disaster recovery) — noted as something to fix there via
`prisma migrate resolve`, not by rewriting an already-applied migration.

### Hero carousel clip previews reuse the scene's existing start time
**PR #18.** The hero's fight-scene clip preview jumps straight to the fight
using `youtubeStartSeconds`, the same field members already set when tagging
a scene — no separate "preview moment" concept needed. Foreshadows exactly
why an untimed scene was worth fixing later: a blank start time degrades a
second surface, not just the scene's own card.

### Public Leaderboard replaces the redundant "My Lists" nav tab
**PR #17.** "My Lists" pointed at the exact same URL as the adjacent
username link once lists moved to the profile page. Replaced with a public
leaderboard (Top Curators, Most-Liked Lists) instead of just deleting the
slot. Self-likes are blocked server-side so an owner can't inflate their own
ranking. Top Curators is ranked in memory rather than a SQL aggregate — the
same tradeoff already made for fight-scene search sorting, since no clean
aggregate spans the two-join path, and it's fine at this app's scale.

### Bulk TMDB import reuses the single-movie endpoint via a client-side queue
**PR #13.** Keyword-search bulk import runs a concurrency-limited queue of
calls against the existing single-movie import endpoint, rather than adding
a dedicated batch endpoint — avoids serverless timeout risk on a large
selection, at the cost of more round-trips than one bulk call would take.

### Movie rail scroll affordances only render when there's real overflow
**PR #11.** Arrows and edge-fades on `MovieRail` are gated on actually
measuring overflow (`scrollWidth` vs. `clientWidth`) rather than assuming
any rail with enough items needs them — an early version false-positived on
rails that happened to fit the viewport, showing scroll affordances for
content that couldn't actually scroll.

### One bulk-import path in the codebase, not two
**PR #10/#11.** Two bulk-import approaches were built independently on
parallel branches — a simple plain-ID-list importer and a CSV importer
supporting title/year/`tmdb_id` resolution. The CSV version was kept when
the branches merged; the simpler one was dropped entirely rather than kept
alongside it, so there's exactly one bulk-import mechanism to reason about.

### One admin guard for the whole /admin tree; papaparse over xlsx
**PR #10.** CSV bulk-import parsing uses `papaparse` rather than the `xlsx`
npm package, which carries advisories SheetJS only patched on their own CDN,
not on npm.

### Poster uploads use a plain server route, not Blob's client-direct-upload pattern
**PR #8.** Posters are small images, well within a serverless function's
body limit, so the simpler server-side `put()` call was chosen over Vercel
Blob's client-direct-upload flow — that pattern needs a reachable webhook,
which breaks in local dev.

### Fight Ticket card deliberately breaks from the site's dark theme
**PR #7.** The Fight Scenes card is styled as a cream, ink-brown tournament
ticket stub, distinct on purpose from the rest of the dark "Poster House"
site — it's the app's differentiator feature and reads like a physical
ticket rather than another movie poster.

### Editorial Review is one shared review per movie, not per-admin
**PR #6.** Unlike `AdminRating` (one row per admin), `EditorialReview` is
unique on `movieId` — any admin can write or update the single shared
review; `authorId` just tracks who last touched it for the byline.

### Fight scene tags are an admin-curated vocabulary, not member-created
**PR #5.** Members choose from an existing tag list when submitting a scene
but can't invent new tags — same shape as the existing `Genre`–`Movie`
relation, keeps the taxonomy from fragmenting into near-duplicate tags over
time.

## Deferred & Backlog

- **News & Updates (admin blog)** — a new `NewsPost` model, `/admin/news`
  CRUD, a public `/news` list page, a nav link, and a homepage teaser
  banner for the latest post. Requested alongside Recent Editor's Reviews;
  Recent Editor's Reviews was built first since it needed no schema change.
- **Move the build version indicator off the global footer** — currently
  visible on every page for every visitor; may move to a less prominent
  spot (e.g. an admin-only page) later. Site-wide footer was fine to start.
- **Pagination on the per-movie fight scene list** — only the dedicated
  `/search/fight-scenes` page paginates today; a single movie's own scene
  list is still unbounded. Explicitly deferred: "not needed now."
- **Editor's Picks rail** — homepage rail surfacing highest editor-rated
  movies; the data model already supports it, the homepage doesn't surface it.
- **Top Rated Fight Scenes rail** — homepage rail using existing fight-scene
  rating data, to put the feature in front of visitors who'd otherwise only
  find it via nav.
- **Browse-by-tag / browse-by-genre quick links** — pill-link strips
  deep-linking straight into filtered search.
- **Cross-member list browsing / "recommended lists"** — lists were made
  public specifically to leave room for this without another schema change;
  no browse UI for other members' lists exists yet beyond a direct permalink.
