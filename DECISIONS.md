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

### News & Updates: flat homepage preview + separate paginated archive
**PR #35.** Landed on this shape after three iterations in preview, each
a real judgment call worth keeping for the "why":

1. Backlog originally recommended a flat `/news` list first (like Recent
   Reviews by Editors started), pagination added once there was volume —
   explicit direction reversed this before building: paginate from day
   one (`/news`, 10/page, footer link, one-line homepage teaser for the
   latest post).
2. After previewing, explicit direction reversed the *page* itself: no
   separate route at all — the full paginated list moved directly onto
   the homepage as a "News & Updates" section (footer link and `/news`
   removed), paginated via a `newsPage` query param scoped to the section
   so it wouldn't collide with anything else on the page.
3. Previewing *that* showed the actual problem: pagination controls
   embedded in the homepage made the section dominate the page (10 full
   posts before you even reached "Recently Added"), and every page-turn
   reloaded the entire homepage server-side (hero, rails, everything) —
   a heavier interaction than pagination usually implies. Landed here:
   the homepage shows a **flat** 5-post preview (matching Recent Reviews'
   scale, no pagination chrome at all) with a "View all →" link, and
   `/news` came back as a real paginated archive (10/page) for anyone who
   wants the full history. This isn't the same redundancy as the
   discarded teaser-plus-page version — a flat preview and a paginated
   archive serve genuinely different intents (glance vs. browse), not two
   views of the same single item.

**Text treatment differs by page, deliberately (4th iteration):** the
homepage strip and the `/news` archive show post text two different ways,
not the same component reused. The archive keeps the full-text-clamped-
to-4-lines-with-a-"Show more"-toggle behavior (reusing Recent Reviews by
Editors' clamp component). The homepage strip instead trims every post to
a fixed ~300-character excerpt (`news-strip.tsx`, cut at the last full
word) regardless of actual length, with **no** expand toggle — the
section's "View all" link already exists as the way to read further, so a
second per-post click-to-expand on the homepage would be redundant. This
also means the homepage strip needs no client-side interactivity at all
(no `"use client"`), unlike the archive's `NewsList`, which still needs
one for its toggle.

Any admin can edit/delete any post (mirrors Editorial Reviews'
shared-not-per-author model, not fight scenes' owner-only model, since
posts aren't member-submitted content).

### Fight scene card UI cleanup: cast on the read-only card, admin tools collapsed by default
**PR #TBD.** Two small improvements to the Fight Ticket card, from a
self-review of what was already shipped this session. *Cast on
`FightSceneResultCard`*: the interactive card (`FightSceneSection`, used
on a movie's own page) has always shown "Featuring X, Y" linked to actor
pages; the read-only result card (search results, list pages, profile,
actor pages) never did, so a scene browsed anywhere except its own movie
page didn't say who was in it. Added the same cast display, which meant
adding `cast` to the Prisma `include` at all four call sites that feed
that card. *Admin tools collapsed*: the "Start at" mm:ss control and the
editor rating/note field were always expanded for admins on every card.
*Considered:* two separate toggles matching their two separate positions
in the card — went with one combined "Admin tools" toggle per card
instead (default collapsed), since both are the same kind of thing
(admin-only, not needed on every view) and a single toggle is simpler
than two without losing anything; each card's toggle state is
independent, so expanding one scene's tools doesn't affect the others.

### Browse-by-tag/genre quick links reuse existing badges rather than adding a new pill strip
**PR #TBD.** The backlog item described "pill-link strips deep-linking
into filtered search." *Considered:* a dedicated new section (e.g. a
homepage genre/tag rail) — passed on it in favor of making the genre
badges already shown on a movie page, and the category-tag badges already
shown on every fight scene card, into links themselves (`/search?genre=`
and `/search/fight-scenes?tag=`). Same destination, no new UI surface or
page real estate, and it puts the link exactly where someone is already
looking at that genre/tag rather than a separate browsing section they'd
have to notice first.

### Submission follow-through: a "View submission" link and a member-facing Pending Submissions section
**PR #30.** Two small follow-ups after adding the "+ Add Movie" nav
link surfaced: a successful submission only showed a toast-style message
with no way to see what was just created, and nothing anywhere reminded a
member they had a submission awaiting review. Added a "View submission →"
link straight to the new (still-pending) movie page right after submitting,
and a **Pending Submissions** row on the member's own profile — same
`MovieRow` component and same owner-only visibility rule already used for
Favorites/Watchlist, not a new pattern. Reuses the existing pending-movie
visibility rule (only the submitter or an admin can load that page) rather
than adding a new one.

### Standalone "Add Movie" nav link, always visible rather than gated on sign-in
**PR #29.** `/movies/submit` was previously only reachable via the "Can't
find it? Add a movie" link on a zero-result search — no direct nav link.
Added a "+ Add Movie" link to the site nav, next to Movies/Fights/Lists.
*Considered:* showing it only to signed-in members, matching the Admin
link's conditional pattern — rejected in favor of matching Movies/Fights/
Lists' always-visible pattern instead, since `/movies/submit` already
handles a signed-out visitor correctly on its own (redirects to `/login`
with the right `callbackUrl`, same as every other gated action in the
app) — no need to duplicate that gate in the nav itself. The zero-result
search link stays as a second, more contextual entry point.

### Actor pages browse-only for now, not wired into the search actor filter
**PR #28.** New `/actors/[personId]`
pages (filmography + every tagged fight scene, reusing existing card
components) needed entry points. Linked from a movie's Cast section and a
fight scene's "Featuring" line, both of which already show one specific
person. *Considered:* also linking out from `/search/fight-scenes`'s actor
filter — passed on it, since that filter is `AutocompleteFilterInput`, a
plain name-string autocomplete shared with the unrelated director filter;
it returns names for filling the search form, not person IDs, and has no
per-suggestion click target. Reworking a shared component for one of its
two use cases wasn't worth it for a filter whose job (narrow results to
one actor) is already satisfied without a profile link. No actor search of
its own exists yet either — browsing via Cast/Featuring links is the only
way in for now.

### Per-movie fight scene pagination is a client-side "Show more," not URL-based paging
**PR #28.** `/search/fight-scenes`
already paginates via `?page=` and a server round-trip per page — the
per-movie list on a movie's own page didn't. *Considered:* the same
URL-based pattern — rejected because `FightSceneSection` is a client
component holding a lot of local mutable state (create/edit/delete,
in-place round-number reflow, draft inputs), and a `?page=` navigation
would either reset all of that or need it threaded through the URL for no
real benefit — a movie's scene count is small enough that fetching all of
them up front (as it already did) isn't a backend concern; the only goal
was not dumping dozens of ticket cards on the page at once. So the fetch
stays as-is and a `visibleCount` client state slices the already-sorted
list, revealed 6 at a time via a "Show more" button — no route change, no
loss of in-progress edits when a page is revealed.

### Fight scenes get a one-tap Favorite, deliberately no Watchlist
**PR #28.** After building
custom-list saving for fight scenes (see the `MemberListFightSceneEntry`
entry below), a follow-up question was whether to also extend movies'
one-tap Favorite/Watchlist toggle (`ListEntry`, `listType:
"FAVORITE"|"WATCHLIST"`, distinct from custom lists) to fight scenes for
UI consistency. *Considered and initially built:* the full pair, mirroring
`ListEntry` as `FightSceneListEntry` with the same `listType` split —
reverted after further thought: a Watchlist is "something to get to later,"
which fits a two-hour movie but not a clip that takes thirty seconds to
watch right where it's already linked, so the *scene* version of Watchlist
had no real use case, and *Favorite* — a one-tap toggle for the two-second
"I like this specific fight," a genuinely different interaction from
picking from a multi-select list — is the one worth keeping. Modeled as
`FightSceneFavorite` (`userId`, `fightSceneId`, unique on the pair, no
`listType` column since there's only ever one kind, unlike `ListEntry`).
A standalone `FavoriteButton` component (a single heart icon, red when
active) replaced routing fight scenes through `ListButtons` — forcing a
single-button case through a component built for a pair would have been
more awkward than the small duplication of a heart icon button.
`ListButtons` itself stayed movie-only. Wired into the same six places
`MemberListFightSceneEntry` was, plus a "Favorite Fight Scenes" section on
the member's own profile page below the existing movie Favorites/Watchlist
rows (no "Fight Scene Watchlist" counterpart, per the above). The heart
shape (not a star) and its red active color were an explicit request,
carried back to the movie-level Favorite button's own icon/text for
consistency in the other direction.

### Saved fight scenes get their own MemberListFightSceneEntry model, not a nullable column on MemberListEntry
**PR #28.** Extending member
lists to hold fight scenes needed a schema decision: add nullable
`movieId`/`fightSceneId` columns to the existing `MemberListEntry` with an
app-level "exactly one is set" rule, or a separate mirrored entry model.
*Considered:* the nullable-column approach — rejected in favor of a second
model (`MemberListFightSceneEntry`, unique on `[listId, fightSceneId]`),
matching the established convention of mirroring shapes for a new content
type (see Fight Scenes' own PR #4 entry above) rather than inventing a
polymorphic one; it keeps both foreign keys required and avoids a
CHECK-constraint or XOR-validation layer just to keep one row from having
both or neither reference set. `AddToListControl` was generalized instead
of duplicated — it now takes a `target: {type: "movie"|"fightScene", id}`
discriminated prop and picks the right endpoint/body key, since the
dropdown/create-list UI is otherwise identical between the two. It also
gained a compact `variant="icon"` (a bookmark icon, same treatment as
`ShareButton`'s existing icon variant) so it fits in the Fight Ticket
card's top row next to the share icon without disrupting that card's
compact layout. Wired into every page that renders a fight scene card —
a movie's own Fight Scenes section, a scene's permalink page, fight scene
search results, a public list page, and a member's own list-management
view — each fetching the *viewing* member's own lists (not the page
subject's), so anyone can bookmark a scene into their own list regardless
of whose page they found it on.

### Recent Reviews by Editors shows full review text, clamped, not a short excerpt
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

### About page's footer link gets its own shared Footer component, not a second `<footer>`
**PR #27.** Adding a footer-only `/about` link meant deciding where it lives
relative to the existing `BuildVersion` component, which already rendered
its own `<footer>` on every page. Rather than stacking a second `<footer>`
element next to it, `BuildVersion` was split down to just its label
(a `<span>`), and a new `Footer` component (`src/components/footer.tsx`)
wraps both the About link and that label in one `<footer>` — one footer
per page, and `BuildVersion` stays reusable if it's ever needed somewhere
that isn't a page-level footer.

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

- **About page copy: mission, About the Creators, Contact/feedback, and
  Community guidelines wording** (**PR #27**) — the mission section ("What
  this site is") and the new "About the Creators" section are both
  placeholders reading "Under construction" pending final copy; the
  Contact/feedback section has no real contact address yet; the guidelines
  bullets are a first draft, not reviewed. Only the curation section
  ("How the catalog is curated") is considered final. Revisit all four
  once final wording, a contact method, and a guidelines review land.
- **Move the build version indicator off the global footer** — currently
  visible on every page for every visitor; may move to a less prominent
  spot (e.g. an admin-only page) later. Site-wide footer was fine to start.
- **Editor's Picks rail** — homepage rail surfacing highest editor-rated
  movies; the data model already supports it, the homepage doesn't surface it.
- **Top Rated Fight Scenes rail** — homepage rail using existing fight-scene
  rating data, to put the feature in front of visitors who'd otherwise only
  find it via nav.
- **Cross-member list browsing / "recommended lists"** — lists were made
  public specifically to leave room for this without another schema change;
  no browse UI for other members' lists exists yet beyond a direct permalink.
