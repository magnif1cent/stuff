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

Before adding an entry: don't read this whole file. Use the Contents below (or
grep `^### ` / `^## `) to find the right section, then read only that entry
and its neighbors to match tone and confirm you're not duplicating an existing
one.

## Contents

**Foundational Changes**

- [MVP stack established](#mvp-stack-established)
- [Fight Scenes introduced as a core feature](#fight-scenes-introduced-as-a-core-feature)
- [Cross-conversation process conventions established](#cross-conversation-process-conventions-established)
- [Poster House visual identity adopted](#poster-house-visual-identity-adopted)
- [Admin area consolidated under one guard](#admin-area-consolidated-under-one-guard)
- [Typo-tolerant search added via Postgres trigram extension](#typo-tolerant-search-added-via-postgres-trigram-extension)
- ["Stay in sync with master" convention added](#stay-in-sync-with-master-convention-added)
- [Member identity and content model expanded](#member-identity-and-content-model-expanded)
- [REVIEWER introduced as a role narrower than ADMIN](#reviewer-introduced-as-a-role-narrower-than-admin)
- [Security headers and a nonce-based CSP added](#security-headers-and-a-nonce-based-csp-added)
- [Rate limiting added via Upstash Redis](#rate-limiting-added-via-upstash-redis)
- [Medium-risk security findings: two fixed, two deferred](#medium-risk-security-findings-two-fixed-two-deferred)
- [Forgot-password added, CAPTCHA added, registration enumeration closed as "not doing"](#forgot-password-added-captcha-added-registration-enumeration-closed-as-not-doing)
- [Poster upload MIME sniffing, and JWT sessions invalidated on password change](#poster-upload-mime-sniffing-and-jwt-sessions-invalidated-on-password-change)
- [Password strength requirements: length over composition, plus a breach check](#password-strength-requirements-length-over-composition-plus-a-breach-check)
- [Login timing side-channel closed with a dummy bcrypt comparison](#login-timing-side-channel-closed-with-a-dummy-bcrypt-comparison)
- [Manual "sign out everywhere" reuses the password-change invalidation, doesn't duplicate it](#manual-sign-out-everywhere-reuses-the-password-change-invalidation-doesnt-duplicate-it)
- [Site renamed from "Kung Fu Movie Database" to "Kung Fu Sauce"](#site-renamed-from-kung-fu-movie-database-to-kung-fu-sauce)
- [Admin badge icons rekeyed by user id, not username](#admin-badge-icons-rekeyed-by-user-id-not-username)
- [Production migration incident: Preview and Production shared one database](#production-migration-incident-preview-and-production-shared-one-database)
- [Trigram indexes declared in schema.prisma, closing the drift-detection gap — partially](#trigram-indexes-declared-in-schemaprisma-closing-the-drift-detection-gap-partially)
- [Breach-password (HaveIBeenPwned) check removed, per explicit request](#breach-password-haveibeenpwned-check-removed-per-explicit-request)
- [Usernames allow mixed case, made case-insensitively unique via a new usernameLower column](#usernames-allow-mixed-case-made-case-insensitively-unique-via-a-new-usernamelower-column)
- [Login switched from fetch-based signIn() to a Server Action with a native form](#login-switched-from-fetch-based-signin-to-a-server-action-with-a-native-form)
- [`master` protected by a GitHub ruleset, no required review](#master-protected-by-a-github-ruleset-no-required-review)
- [Reversed: Claude sessions no longer self-merge on green CI](#reversed-claude-sessions-no-longer-self-merge-on-green-ci)
- [Vercel preview deployments deleted on PR close, to stop Neon preview-branch pileup](#vercel-preview-deployments-deleted-on-pr-close-to-stop-neon-preview-branch-pileup)
- [Weekly Trending Carousel's cron had never run — `CRON_SECRET` was never configured in Production](#weekly-trending-carousels-cron-had-never-run-cron_secret-was-never-configured-in-production)
- [Preview database made static across PRs, trading back the migration-collision risk to stop re-seeding every branch](#preview-database-made-static-across-prs-trading-back-the-migration-collision-risk-to-stop-re-seeding-every-branch)

**Feature Decisions**

- [Community Activity feed merges three existing tables, no new schema](#community-activity-feed-merges-three-existing-tables-no-new-schema)
- [Error monitoring added without wrapping next.config.ts in Sentry's build plugin](#error-monitoring-added-without-wrapping-nextconfigts-in-sentrys-build-plugin)
- [Search substring queries got their own trigram indexes, separate from the fuzzy-search ones](#search-substring-queries-got-their-own-trigram-indexes-separate-from-the-fuzzy-search-ones)
- [Fight Count: single member-editable field, not an aggregate — with guardrails to compensate](#fight-count-single-member-editable-field-not-an-aggregate-with-guardrails-to-compensate)
- [Subcategory rating widget: progressive reveal + star picker, now on both member and admin widgets](#subcategory-rating-widget-progressive-reveal-star-picker-now-on-both-member-and-admin-widgets)
- [Subcategory ratings: supplement the overall score, fixed category list, movies only](#subcategory-ratings-supplement-the-overall-score-fixed-category-list-movies-only)
- [Movie/actor SEO metadata and actor-page TMDB bios](#movieactor-seo-metadata-and-actor-page-tmdb-bios)
- [Admin Recommendations: per-admin badges, not a single shared flag](#admin-recommendations-per-admin-badges-not-a-single-shared-flag)
- [Cross-member list browsing at `/lists`, separate from the leaderboard](#cross-member-list-browsing-at-lists-separate-from-the-leaderboard)
- [News & Updates: flat homepage preview + separate paginated archive](#news-updates-flat-homepage-preview-separate-paginated-archive)
- [Fight scene card UI cleanup: cast on the read-only card, admin tools collapsed by default](#fight-scene-card-ui-cleanup-cast-on-the-read-only-card-admin-tools-collapsed-by-default)
- [Browse-by-tag/genre quick links reuse existing badges rather than adding a new pill strip](#browse-by-taggenre-quick-links-reuse-existing-badges-rather-than-adding-a-new-pill-strip)
- [Submission follow-through: a "View submission" link and a member-facing Pending Submissions section](#submission-follow-through-a-view-submission-link-and-a-member-facing-pending-submissions-section)
- [Standalone "Add Movie" nav link, always visible rather than gated on sign-in](#standalone-add-movie-nav-link-always-visible-rather-than-gated-on-sign-in)
- [Actor pages browse-only for now, not wired into the search actor filter](#actor-pages-browse-only-for-now-not-wired-into-the-search-actor-filter)
- [Per-movie fight scene pagination is a client-side "Show more," not URL-based paging](#per-movie-fight-scene-pagination-is-a-client-side-show-more-not-url-based-paging)
- [Fight scenes get a one-tap Favorite, deliberately no Watchlist](#fight-scenes-get-a-one-tap-favorite-deliberately-no-watchlist)
- [Saved fight scenes get their own MemberListFightSceneEntry model, not a nullable column on MemberListEntry](#saved-fight-scenes-get-their-own-memberlistfightsceneentry-model-not-a-nullable-column-on-memberlistentry)
- [Recent Reviews by Editors shows full review text, clamped, not a short excerpt](#recent-reviews-by-editors-shows-full-review-text-clamped-not-a-short-excerpt)
- [Build version footer: commit SHA, not semantic versioning](#build-version-footer-commit-sha-not-semantic-versioning)
- [About page's footer link gets its own shared Footer component, not a second `<footer>`](#about-pages-footer-link-gets-its-own-shared-footer-component-not-a-second-footer)
- [Fight scene start time is admin-only, decoupled from submitter edits](#fight-scene-start-time-is-admin-only-decoupled-from-submitter-edits)
- [Movie rail scrollbar: themed, not hidden](#movie-rail-scrollbar-themed-not-hidden)
- [Rating filters: star-click picker over stepper or number input](#rating-filters-star-click-picker-over-stepper-or-number-input)
- [Director/actor filters: autocomplete over a full dropdown](#directoractor-filters-autocomplete-over-a-full-dropdown)
- [Fight scenes get their own search page, not folded into movie search](#fight-scenes-get-their-own-search-page-not-folded-into-movie-search)
- [Filter layout: vertical sidebar over horizontal bar](#filter-layout-vertical-sidebar-over-horizontal-bar)
- [One canonical Vercel project, two duplicates deleted](#one-canonical-vercel-project-two-duplicates-deleted)
- [Reverted a migration rename rather than "fixing" ordering on a live database](#reverted-a-migration-rename-rather-than-fixing-ordering-on-a-live-database)
- [Hero carousel clip previews reuse the scene's existing start time](#hero-carousel-clip-previews-reuse-the-scenes-existing-start-time)
- [Public Leaderboard replaces the redundant "My Lists" nav tab](#public-leaderboard-replaces-the-redundant-my-lists-nav-tab)
- [Bulk TMDB import reuses the single-movie endpoint via a client-side queue](#bulk-tmdb-import-reuses-the-single-movie-endpoint-via-a-client-side-queue)
- [Movie rail scroll affordances only render when there's real overflow](#movie-rail-scroll-affordances-only-render-when-theres-real-overflow)
- [One bulk-import path in the codebase, not two](#one-bulk-import-path-in-the-codebase-not-two)
- [One admin guard for the whole /admin tree; papaparse over xlsx](#one-admin-guard-for-the-whole-admin-tree-papaparse-over-xlsx)
- [Poster uploads use a plain server route, not Blob's client-direct-upload pattern](#poster-uploads-use-a-plain-server-route-not-blobs-client-direct-upload-pattern)
- [Fight Ticket card deliberately breaks from the site's dark theme](#fight-ticket-card-deliberately-breaks-from-the-sites-dark-theme)
- [Editorial Review is one shared review per movie, not per-admin](#editorial-review-is-one-shared-review-per-movie-not-per-admin)
- [Fight scene tags are an admin-curated vocabulary, not member-created](#fight-scene-tags-are-an-admin-curated-vocabulary-not-member-created)
- [Member profile split into tabs, own-profile view only](#member-profile-split-into-tabs-own-profile-view-only)
- [Member profile bio field](#member-profile-bio-field)
- [Member profile: Activity and Liked Lists tabs](#member-profile-activity-and-liked-lists-tabs)
- [Lists and Liked Lists merged into one tab with an inner toggle](#lists-and-liked-lists-merged-into-one-tab-with-an-inner-toggle)
- [Member profile stats strip](#member-profile-stats-strip)
- [Member-facing password change added to the Profile tab](#member-facing-password-change-added-to-the-profile-tab)
- [Member profile: location and website/social link fields](#member-profile-location-and-websitesocial-link-fields)
- [Profile tab fields made directly editable, no click-to-expand](#profile-tab-fields-made-directly-editable-no-click-to-expand)
- [Social platform icons for the website/social link field](#social-platform-icons-for-the-websitesocial-link-field)
- [Trending carousel clip autoplay bounded to one lap, paused when the tab is hidden](#trending-carousel-clip-autoplay-bounded-to-one-lap-paused-when-the-tab-is-hidden)
- [Trending carousel autoplay cap raised from 1 lap to 5](#trending-carousel-autoplay-cap-raised-from-1-lap-to-5)
- [Actor Career Highlights styled like the Signature Spotlight banner, "Sparring Partner" from existing fight-scene data](#actor-career-highlights-styled-like-the-signature-spotlight-banner-sparring-partner-from-existing-fight-scene-data)

**Deferred & Backlog**

Flat bullet list, not headers — grep `^- \*\*` in this section for titles.

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

### REVIEWER introduced as a role narrower than ADMIN
A three-role model (`USER`/`REVIEWER`/`ADMIN`) replaces the previous binary
one, driven by a concrete need: someone who should be able to verify
member-submitted movies, manage the fight-scene-tag vocabulary, and verify
fight scenes, without the rest of `ADMIN`'s reach (TMDB import, News &
Updates, catalog deletion, Editors' Score, editorial reviews, discussion
moderation).

- No schema migration — `role` was already a plain `String` with no DB-level
  check constraint, just an app-level convention (documented in a schema
  comment). Adding a third accepted value only required updating that
  comment and the permission checks themselves.
- `requireReviewerSession()` (ADMIN or REVIEWER) added alongside the existing
  `requireAdminSession()` (ADMIN-only, unchanged) in `src/lib/require-admin.ts`,
  rather than replacing the single admin check everywhere — most admin-gated
  routes (TMDB import, News, catalog deletion, Editors' Score/rating,
  editorial reviews, discussion moderation, poster overrides,
  recommendations, fight-scene start-time/admin-rating) stay on
  `requireAdminSession()` untouched. Only the three routes REVIEWER actually
  needed — movie approval, fight-scene-tag CRUD, fight-scene verify — moved
  to the broader check.
- Movie rejection needed its own endpoint (`POST /api/admin/movies/[id]/reject`,
  REVIEWER-accessible but scoped to `status: "PENDING"` rows only) rather
  than granting REVIEWER access to the existing general `DELETE
  /api/admin/movies/[id]` (ADMIN-only, deletes *any* catalog movie). Branching
  that shared route on role and target status would have made "can this
  account delete this movie" depend on two different things read together;
  a separate, narrowly-scoped route keeps REVIEWER's blast radius provably
  limited to their own review queue.
- `FightSceneSection`'s existing `isAdmin` prop already bundled several
  admin-only powers together (delete any scene, start-time adjustment,
  editors' rating/note) behind one boolean and one "Admin tools" toggle.
  Rather than broaden `isAdmin` itself (which would have handed REVIEWER all
  of those, not just verify), a second prop `canVerify` was added,
  defaulting to `isAdmin`'s value so no other call site's behavior changed
  by omission. Only the Verify/Unverify button reads `canVerify`; everything
  else under the "Admin tools" toggle still reads `isAdmin`.
- REVIEWER also gets self-service `/admin/account` access (own email/password),
  not just the three review capabilities — same rationale as why that page
  exists for ADMIN at all (self-service beats needing someone to run raw
  SQL), and managing your own credentials isn't a content-moderation power
  that needs withholding.
- No user-management UI added for granting the role itself — promoting an
  account to REVIEWER (or ADMIN) is still a direct database `UPDATE`,
  consistent with how ADMIN promotion has always worked in this project.

### Security headers and a nonce-based CSP added
Driven by a security review that found no headers configured at all — no
CSP, no clickjacking protection, no HSTS. Two files split the work by
what needs per-request state:

- `next.config.ts`'s `headers()` sets the static ones (`X-Frame-Options`,
  `X-Content-Type-Options`, `Referrer-Policy`, `Strict-Transport-Security`)
  across every route, API included — cheap defense in depth even though
  most of them only matter for HTML pages.
- `src/proxy.ts` sets `Content-Security-Policy` separately, since a
  meaningful `script-src` needs a fresh nonce per request. Considered a
  static `script-src` allowlist first — rejected because Next.js injects
  its own bootstrap/hydration scripts, so a static policy would need
  `'unsafe-inline'` to avoid breaking the app, which defeats CSP's main
  purpose. Followed Next's own documented nonce + `'strict-dynamic'`
  pattern instead: the proxy function generates a nonce, sets it as both a
  request header (`x-nonce`) and on the CSP response header, and Next
  auto-applies it to its own script tags with no other code changes
  needed. `'unsafe-eval'` is added to `script-src` in development only —
  Turbopack's dev server/React Refresh needs it, production doesn't, and
  gating it behind `NODE_ENV` keeps the deployed policy strict without
  breaking local dev. (Written as `src/middleware.ts` originally; renamed to
  `src/proxy.ts` after Next.js 16.3.0 deprecated the `middleware` file
  convention in favor of `proxy` — same behavior, new file/export name.)
- `img-src`/`frame-src` explicitly allowlist only the external hosts the
  app actually embeds (TMDB images, Vercel Blob poster overrides, YouTube
  thumbnails and `youtube-nocookie.com` embeds) rather than a broader
  wildcard — narrower than "works," but every current embed source is
  already a known, fixed list.
- Verified against both a production build (`next start`) and `next dev`,
  not just `next build` succeeding: logged in, registered a new account,
  and confirmed a fight scene's YouTube iframe actually rendered, all with
  browser console CSP-violation monitoring attached. One console warning
  is expected and left alone: `/_vercel/insights/script.js` 404s locally
  because that path is only ever handled by Vercel's actual platform, not
  `next dev`/`next start` — not a CSP bug, Vercel Analytics is a
  documented no-op outside a real Vercel deployment.
- Rate limiting (login, registration, content-creation endpoints) was
  identified in the same review but deliberately not addressed here — it
  needs an infrastructure decision (an external store like Upstash Redis
  for correctness across serverless instances, vs. a weaker in-memory
  approximation, vs. Vercel's platform-level Firewall) that headers and
  dependency bumps don't, so it's tracked separately rather than folded
  into this change.

### Rate limiting added via Upstash Redis
Follow-up to the deferred item above. `src/lib/rate-limit.ts` centralizes
seven limiters built on `@upstash/ratelimit`'s sliding-window algorithm.

- **Upstash Redis over in-memory or Vercel Firewall**: an in-memory counter
  resets on every serverless cold start and isn't shared across instances,
  so it wouldn't actually stop a distributed attempt — the whole point of
  the feature. Vercel's platform Firewall operates below the
  application (IP/path-based), so it can't key a limit by email or user id
  the way login and per-user content limits need. Upstash's free tier and
  its REST-based client (works over plain HTTPS, no persistent connection
  needed from serverless functions) made it the practical choice.
- **Fails open, not closed, when unconfigured**: every limiter is `null`
  unless `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` are set, and
  `checkRateLimit()` no-ops on a `null` limiter rather than blocking every
  request — same pattern as `RESEND_API_KEY` and `BLOB_READ_WRITE_TOKEN`
  elsewhere in this app. Local dev and CI never need Upstash credentials.
- **Keyed by identity where identity is what's attacked, by IP otherwise**:
  login is keyed by the target email (a credential-stuffing/brute-force
  defense against one account — IP is easily rotated, and not reliably
  available inside `authorize()` anyway) and content-creation limiters are
  keyed by user id (already authenticated at that point). Registration,
  the one unauthenticated write endpoint, is keyed by IP since there's no
  identity yet to key on.
- **Rate-limited logins fail exactly like a wrong password**: `authorize()`
  returns `null` either way, surfacing Auth.js's generic `CredentialsSignin`
  error in both cases — a distinct "you're rate limited" response would
  itself leak information (that the email/rate-limit state is real) to an
  attacker probing accounts.
- **Verified against a real Redis-backed limiter, not just code review**:
  since Upstash's REST API is fundamentally "a JSON array Redis command
  over HTTP," a small local shim (Node `http` server plus a local
  `redis-server`) stood in for a real Upstash database during testing,
  confirming both the no-op-when-unconfigured path and actual enforcement
  (5-per-window on login/registration, etc., with 429s and a correct
  `Retry-After` once exceeded) for all seven limiters.

### Medium-risk security findings: two fixed, two deferred
Follow-up to the original security review (see above). Of the five
remaining findings, two were clean, self-contained fixes; the other three
were left alone — either genuinely low-risk or a real product tradeoff
that shouldn't be made silently as part of a security patch.

- **Fixed — raw exception messages returned to clients**: six routes
  (`movies/search`, `movies/submit`, and four `admin/tmdb/*` routes) caught
  errors and returned `(error as Error).message` directly, which could
  surface an upstream TMDB response body or an internal misconfiguration
  hint (e.g. a missing-API-key message) to the client. New
  `src/lib/api-error.ts` centralizes the fix: log the real error
  server-side, return a fixed generic message to the client.
- **Fixed — `CRON_SECRET` compared with `!==`**: string `!==` short-circuits
  on the first differing byte, which is a textbook timing side-channel
  (impractical to exploit over typical network jitter, but a one-line fix
  with `crypto.timingSafeEqual` removes the anti-pattern entirely rather
  than relying on that impracticality).
- **Deferred — registration email enumeration**: registering with an
  already-used email returns an explicit "account already exists" error,
  letting an attacker check which emails have accounts. Closing this fully
  means the client can no longer auto-sign-in right after registration
  (a successful sign-in for a genuine new account vs. a failed one for an
  attacker guessing an existing account's password re-leaks the same
  signal at the login step) — i.e. it's a permanent UX regression (no more
  instant browsing after signup) for every future user, not just
  attackers, to close a signal that rate limiting (already shipped) makes
  expensive to exploit at scale. Left as-is pending a product decision
  rather than folded into a security patch.
- **Deferred — poster upload MIME validation**: `admin/movies/[id]/poster`
  trusts the browser-reported `file.type` rather than sniffing actual file
  content, so a spoofed `Content-Type` could get stored/served with a
  mismatched type. Left as low-risk since the route is `ADMIN`-only —
  exploiting it needs an already-privileged account, which has much more
  direct ways to cause damage than a poster upload.
- **Deferred — bcrypt cost factor of 10**: still within OWASP's accepted
  range (bumping to 12 is best-practice hardening, not a fix for an actual
  weakness) and re-hashing existing users' passwords isn't free, so left
  alone rather than bundled into this pass.

### Forgot-password added, CAPTCHA added, registration enumeration closed as "not doing"
Follow-up to the two items deferred above (registration enumeration,
bcrypt cost) plus a real functional gap found separately: there was no
self-service account recovery at all — a password-only member who forgot
their password had no path back into their account (only Google-sign-in
users had a fallback).

- **Forgot-password, built anti-enumeration from the start**: unlike
  registration, a forgot-password endpoint has no reason to ever reveal
  whether an email has an account — `/api/forgot-password` always returns
  the same response and only sends an email (with a fresh
  `PasswordResetToken`, 1 hour TTL, single-use) when a password actually
  exists to reset. A Google-only account gets no email either, on purpose:
  offering to "reset" a nonexistent password would itself be a signal that
  distinguishes it from a nonexistent email, reopening exactly the gap this
  flow is supposed to avoid. `PasswordResetToken` is a separate model from
  the existing `VerificationToken`, not a reuse of it — a password-reset
  token grants account takeover, a verification token doesn't, and mixing
  the two risks a bug where one gets accepted as the other. The
  reset-password step itself (token + new password) needs no CAPTCHA — it's
  already gated by possession of the emailed token, not open to bulk
  probing the way the request step is.
- **CAPTCHA (Cloudflare Turnstile) added to registration and
  forgot-password, not login**: both endpoints are attractive to automated
  bulk abuse (mass account creation; mass password-reset email spam) in a
  way login isn't — login already has a per-email rate limit, and a CAPTCHA
  on every mistyped password would be pure friction for legitimate members
  with no bulk-abuse upside to justify it. Fails open the same way every
  other optional service in this app does: without
  `NEXT_PUBLIC_TURNSTILE_SITE_KEY`/`TURNSTILE_SECRET_KEY` set, the widget
  doesn't render and the server doesn't require a token, so local dev and
  CI are unaffected. The widget is a client component fed the page's CSP
  nonce as a prop (read server-side via `headers()` in a Server Component
  wrapper, since a client component can't read response headers itself) —
  `'strict-dynamic'` means the CSP's trailing `https:` fallback is ignored
  entirely once present, so the nonce is required, not optional, for
  Turnstile's script tag to load at all. `frame-src` and `connect-src` both
  needed `challenges.cloudflare.com` added — Turnstile's challenge UI runs
  in an iframe from that host, separate from the script itself.
- **bcrypt cost bumped 10 → 12**: the deferral above was about whether it
  was worth doing at all (still-acceptable range), not a technical
  blocker — once touching password code for forgot-password anyway, it was
  cheap to include. Note this only changes the cost for newly-created
  hashes (registration, password change, password reset); existing users'
  hashes stay at cost 10 until they next change their password — bcrypt
  embeds its own cost factor per-hash, so `bcrypt.compare` handles either
  transparently, and there's no forced re-hash migration.
- **Registration enumeration: closed as "not doing," not deferred
  further**: the earlier deferral was pending a product decision on the
  full fix (drop auto-login-after-registration for everyone, permanently).
  With CAPTCHA now on registration, the actual threat that fix was guarding
  against — bulk automated harvesting of which emails have accounts — is
  already neutralized; a manual, targeted check of a handful of specific
  emails was never something the full redesign would have stopped either
  (a patient attacker can still time responses). The UX cost of the full
  fix no longer buys enough to be worth it, so registration keeps its
  explicit "account already exists" message.

### Poster upload MIME sniffing, and JWT sessions invalidated on password change
Closes the last item deferred above (poster upload MIME validation) plus a
gap found while building forgot-password but not fixed at the time: a
password reset changed the password but didn't revoke any other session
already open on the account, which undercuts forgot-password's whole
reason to exist (locking out someone who already has your password/cookie).

- **Poster upload now sniffs actual file bytes**: `admin/movies/[id]/poster`
  previously trusted the browser-reported `file.type`, which a client fully
  controls independent of what it actually uploads. New
  `src/lib/image-type.ts` checks the real signature (JPEG's `FF D8 FF`,
  PNG's 8-byte magic, WebP's `RIFF`/`WEBP` markers) with no new dependency —
  three signatures didn't justify pulling in a library. The sniffed type,
  not the client-declared one, is what gets sent to Vercel Blob as the
  stored `Content-Type` too, so a spoofed declaration can't get a mismatched
  type all the way to storage.
- **JWT sessions now carry a `passwordChangedAt` baseline, checked on every
  request**: a new `User.passwordChangedAt`, set whenever `passwordHash` is
  (re)written (registration, admin password change, forgot-password reset),
  is embedded in the JWT at sign-in and re-compared against the live DB
  value in every subsequent `jwt` callback invocation — Auth.js re-runs this
  callback on every session check for JWT-strategy sessions, not just at
  sign-in, which is what makes a fresh per-request check possible at all.
  A mismatch returns `null`, which Auth.js's own session handling treats as
  "clear this cookie" — confirmed against `@auth/core`'s actual
  `session()` action source, not just its types, since a wrong assumption
  here silently breaks either the invalidation itself or every unrelated
  session, and both are hard to notice without staring at the specific
  cookie behavior.
  - **Real bug caught while building this, not just theorized**: the
    first version compared against `null` as the "unset" baseline and
    skipped the check whenever the token had one — which meant *any*
    account's very first password change after this shipped (every
    account that existed before it, and any brand-new one before the fix
    below) silently failed to invalidate other sessions, since both the
    old session's baseline and the freshly-changed DB value read as
    equivalent "nothing to compare." Reproduced end-to-end against a real
    two-session test before fixing it: switched the sentinel from `null`
    to `0` on both sides of the comparison (and registration now sets
    `passwordChangedAt` at account creation, not just on later changes),
    so an account's first-ever change is a real transition from `0` to a
    timestamp instead of an unset-to-unset no-op.
  - **Ships a one-time global sign-out**: a session issued before this
    check existed has no `passwordChangedAt` claim on its token at all
    (`undefined`, not `0`), which never equals any DB value and so is
    always treated as stale on its first post-deploy request. Accepted
    deliberately rather than designed around — it costs nothing (everyone
    just signs back in) and avoids a permanently-exempt class of
    pre-existing sessions that a more careful migration would otherwise
    require.
  - **A real per-request DB query, not a cached claim**: the existing
    `role`/`username` caching in this callback only re-queried when those
    fields were missing from the token (i.e., effectively once per
    session). That pattern doesn't work here — checking "sometimes" would
    mean a reset mostly doesn't revoke anything, since most requests
    would hit the cached, already-stale path. Accepted the extra query on
    every authenticated request as the cost of the property actually
    holding, and folded the existing role/username refresh into the same
    query rather than running two — which incidentally also means a role
    promotion now takes effect on a user's very next request instead of
    requiring them to sign out and back in first.

### Password strength requirements: length over composition, plus a breach check
Minimum was 8 characters with no other rule. Raised to 12 and added two
more checks, all through one shared `validateNewPassword()` in
`src/lib/password.ts` used by registration, admin password change, and
forgot-password reset, rather than three separately-drifting checks.

- **Length over composition rules, deliberately**: considered requiring a
  mix of uppercase/number/symbol (the older, more familiar pattern) and
  rejected it — current NIST/OWASP guidance argues against composition
  rules specifically because they push people toward predictable,
  guessable patterns (`Password1!`) rather than actually harder-to-guess
  passwords, and a longer minimum accomplishes more for the same UX cost.
  12 was picked as a modern-baseline number, not derived from a specific
  threat model beyond "meaningfully more than 8."
- **72-byte max, tied to bcrypt's real limit, not an arbitrary cap**: bcrypt
  silently truncates its input past 72 bytes — anything after that is never
  actually hashed, so a very long password was already giving less benefit
  than its length implied, silently. Capping input at 72 bytes turns a
  silent limitation into an explicit, honest one. Checked by UTF-8 byte
  length, not JS string length/character count, since bcrypt's limit is a
  byte limit and multi-byte characters (emoji, non-Latin scripts) would
  otherwise let a password past the real limit while still under a
  character-count cap.
- **HaveIBeenPwned Pwned Passwords check, keyless, no `.env` entry**: unlike
  every other external service integration in this app (Resend, Vercel
  Blob, Upstash, Turnstile), this needed no account, no API key, and no new
  environment variable — it's a free, keyless public API built specifically
  for this k-anonymity use case (only a 5-character hash prefix leaves the
  server, never the password or its full hash), so there's nothing to gate
  behind an optional env var. What is shared with every other integration:
  it fails open. A network failure or non-200 response is treated as "not
  known to be pwned" rather than blocking the request — an outage in a
  third-party breach-password lookup should never be the reason someone
  can't register or recover their account. Verified this specific path
  matters here: this sandbox's network policy blocks
  `api.pwnedpasswords.com` outright (confirmed via the agent proxy's own
  status endpoint, not just an assumption), so registration in local
  testing exercises the fail-open path on every request — real detection
  of a known-breached password was verified separately, by mocking `fetch`
  around the actual `isPwnedPassword()` function rather than only
  reasoning about it, to confirm the SHA-1 prefix/suffix split and match
  logic are correct independent of network access.

### Login timing side-channel closed with a dummy bcrypt comparison
Found while reviewing what else was worth hardening around login, after
the password-strength pass above. `authorize()` in `auth.ts` returned
immediately when no account matched the submitted email — skipping
`bcrypt.compare()` entirely — but ran a real (deliberately slow) compare
whenever an account did exist, even on a wrong password. That's a timing
side-channel: "no such account" answers fast, "wrong password" answers
slow, letting an attacker tell the two apart by response latency alone,
regardless of both cases returning the identical generic `CredentialsSignin`
error text. That generic error was specifically written earlier (see the
rate-limiting entry above) to avoid leaking exactly this distinction
through the response *content* — a timing gap re-opens the same leak
through a different channel the earlier fix didn't address, since it
wasn't in scope at the time.

Fixed with the standard mitigation: a fixed, valid bcrypt hash
(`DUMMY_PASSWORD_HASH`, cost 12 — matching real hashes' cost, since a
mismatched cost factor would itself reintroduce a smaller timing gap)
that isn't derived from any real password and always fails comparison.
`bcrypt.compare()` now runs against either the real hash or this dummy
one, unconditionally, so both code paths do the same amount of work
regardless of whether the account exists.

### Manual "sign out everywhere" reuses the password-change invalidation, doesn't duplicate it
Two more small findings from the same login/password hardening pass,
both self-contained enough not to need their own entry.

- **"Sign out everywhere" is a thin trigger on existing machinery, not a
  new mechanism**: the session-invalidation check added earlier already
  compares `User.passwordChangedAt` against each session's baseline on
  every request. Rather than build a second, parallel way to invalidate
  sessions (e.g. a session-version counter), `POST
  /api/admin/account/sign-out-everywhere` just bumps that same column
  without touching `passwordHash` — the existing `jwt` callback does the
  rest, unchanged. Deliberately signs out the calling session too, not
  just other devices: matches how "sign out everywhere" reads to a user,
  and avoids a special case in the invalidation check to exempt "this one
  session, for now." Verified server-side, not just via the client's
  `signOut()` call — the calling session's own cookie was confirmed
  invalid via `/api/auth/session` immediately after, independent of any
  client-side cleanup.
- **Only reachable from `/admin/account`, so only `ADMIN`/`REVIEWER`
  accounts get it right now**: regular `USER` members have no
  account-settings page at all today (a pre-existing gap, not something
  this pass introduced or was scoped to fix) — forgot-password is their
  only self-service credential path. Adding a member-facing account page
  was out of scope for what was asked here; worth revisiting alongside
  whatever eventually gives regular members self-service settings.
- **`autoComplete` attributes added to every credential input**: a
  concrete, previously-observed gap (a real browser dev-console warning
  surfaced during earlier testing in this same hardening pass) rather
  than a speculative one. Matters beyond tidiness — a password manager
  that can't tell a field is `new-password` vs. `current-password` is
  less likely to offer to save or generate a credential, nudging people
  toward typing something memorable (i.e. weaker) by hand instead, which
  works against the length/breach-check requirements added earlier in
  this same pass.

### Site renamed from "Kung Fu Movie Database" to "Kung Fu Sauce"
**PR #TBD.** Admin decision, not a technical judgment call — recorded here
so the rename shows up in the same place every other foundational milestone
does, and so a future conversation searching for why the brand name doesn't
match an old screenshot/PR title finds the answer instead of assuming a
docs typo.

- Every user-visible and code-visible occurrence of the old name updated in
  one pass rather than piecemeal: `README.md`, `CLAUDE.md`, `package.json`'s
  `name` field, the root layout's `<title>` default/template, the About
  page's metadata, verification/password-reset email subject and from-name,
  and the OG description fallback text on movie and actor pages. Found via
  a repo-wide grep for every old-name variant (`Kung Fu Movie Database`,
  `Kung Fu Movie DB`, `Kung Fu DB`, `kung-fu-movie-database`) rather than
  updating only the files that came to mind, since a partial rename (new
  name on the homepage, old name still in a password-reset email subject
  line) would be a worse, more confusing state than the rename not
  happening yet.
- **Resolved**: `src/components/logo.tsx`'s 師父 (Sifu — "master/teacher")
  prefix on the navbar wordmark was flagged rather than silently kept or
  dropped, since it read naturally next to "Kung Fu DB" but its fit
  alongside "Sauce" was a real brand-tone question, not a mechanical part
  of the rename. Admin call: drop it. The wordmark is now plain "Kung Fu
  Sauce," inheriting the `<Link>`'s existing `text-red-600` directly rather
  than leaving a now-pointless white-text `<span>` wrapper behind — without
  a colored prefix to contrast against, the old two-tone split had nothing
  left to split.
- **Not touched, deliberately out of scope for a code-level rename**: the
  actual Vercel project name/dashboard, the live domain, and the local dev
  database name (`kungfu_dev` in `.env.example`'s example connection
  string) — none of those are user-visible brand surfaces, and renaming
  the local DB specifically would force every existing local setup to
  recreate it for a purely cosmetic reason.

### Admin badge icons rekeyed by user id, not username
**PR #TBD.** Found as a real, reproduced bug, not a theoretical one: an
admin's custom recommendation-badge icon (`src/lib/admin-badge-icons.ts`)
silently reverted to the generic colored-circle placeholder the moment
that admin's username changed, because the lookup table was keyed by the
username string itself. Usernames are a mutable, member-changeable field
(currently only changeable via a direct database update, since there's no
self-service username-change feature yet) — keying anything long-lived by
one instead of a stable id is exactly the kind of drift this project's own
`CLAUDE.md` conventions (derive from immutable relations, not
hand-duplicated strings) exist to prevent, and this table was the one spot
that didn't follow it. Rekeyed by the admin's `User.id` instead, matching
how `adminBadgeColor()` in the same feature already keys off id rather
than username — the fix makes the two functions consistent with each
other, not just with the general principle.

### Production migration incident: Preview and Production shared one database
**PR #TBD.** A real production incident, not a hypothetical risk. A different,
unmerged conversation's branch (`claude/admin-private-lists`) triggered a
preview deployment whose `prisma migrate deploy` ran against what turned out
to be the *same* database as production — because Vercel's `DATABASE_URL`
was scoped to "Production and Preview" together, one connection string for
both. That branch's migration tried to `DROP INDEX` on the trigram indexes
from the search-indexing fix above; the drop failed because those indexes
didn't yet exist in that database, which left a failed migration record
blocking every subsequent production deploy (Prisma refuses to apply new
migrations while an unresolved failure exists) until it was manually cleared.

- **Root cause was two-layered, not one bug**: the immediate trigger was that
  branch's migration, but the *reason* it contained a `DROP INDEX` for
  indexes it had never heard of is that those indexes were declared only via
  raw SQL in a migration file, invisible to `schema.prisma` — so any other
  conversation's ordinary `prisma migrate dev` would see them as
  undeclared drift and auto-generate a statement to remove them. Not that
  branch's mistake; a direct, foreseeable consequence of how the earlier fix
  was built. See the next entry for the actual fix to that layer.
- **Unblocking production**: the failed migration recorded zero actual
  changes (it died on its very first statement), so the safe resolution was
  deleting that one row from `_prisma_migrations` directly via Neon's SQL
  Editor, then triggering a fresh deploy from `master`'s current HEAD —
  no partial-state cleanup needed, confirmed by the fact the DROP was the
  very first statement in the file.
- **The actual fix — isolating Preview from Production**: installed Vercel's
  Neon integration, scoped to auto-create a fresh, isolated database branch
  per preview deployment, with Production's `DATABASE_URL` left completely
  outside the integration's management (kept on the original, manually-set
  variable, narrowed to the Production environment only). This was
  deliberately the more conservative of two options — letting the
  integration also manage Production's variable was available, but
  minimizing what the integration can touch mattered more given this
  specific integration had reportedly broken production once before, for
  this same account, in an unrelated earlier attempt.
- **Verified as real isolation, not just correct-looking configuration**:
  triggered a genuine preview deployment (an empty commit on a throwaway
  branch) after connecting the integration, and confirmed its live preview
  URL showed a completely empty catalog — proof the preview environment was
  reading from a fresh, dataless branch rather than production's real data —
  then separately confirmed production's actual live site was untouched.
  Config screenshots alone were treated as insufficient evidence, given the
  account's prior bad experience with this exact integration.

### Trigram indexes declared in schema.prisma, closing the drift-detection gap — partially
Direct follow-up to the incident above, fixing the layer that made it
possible in the first place. Confirmed via `prisma validate` that this
Prisma version supports declaring a GIN index with a custom operator class
on a plain column (`@@index([title(ops: raw("gin_trgm_ops"))], type: Gin)`),
so the four plain-column trigram indexes added for ILIKE search
(`Movie.title`, `Movie.director`, `Person.name`, `FightScene.title`) are now
declared in `schema.prisma` with `map:` pinned to their existing index
names — confirmed via `prisma migrate dev --create-only` that this produced
a genuinely empty migration (deleted rather than committed, since it does
nothing on any environment), proving the schema now matches the database
exactly rather than describing a change that still needs applying.

**This only closes half the gap, and that's a real, permanent limitation,
not an oversight left for later**: tested declaring an *expression* index
(the earlier fuzzy-search fallback's two indexes, on `lower(title)` and
`lower(director)`) and confirmed Prisma's schema DSL rejects it outright —
it has no syntax for indexing a functional expression, only plain columns
with a chosen operator class. Those two indexes remain raw-SQL-only,
undeclared, and theoretically exposed to the same drift-detection problem
this fix closes for the other four. Revisit if Prisma ever adds expression-
index support; until then, anyone touching `Movie`'s schema should know
those two are still there and still invisible to `prisma migrate dev`.

### Breach-password (HaveIBeenPwned) check removed, per explicit request
Reversal, not a new finding — the HaveIBeenPwned check added in
"Password strength requirements" above was removed at the site owner's
request, to reduce signup/password-change friction. The 12-character
minimum and 72-byte maximum from that same change are unaffected and
still enforced; only the breach-database lookup is gone.
`isPwnedPassword()` and its `PWNED_PASSWORDS_RANGE_URL` were deleted
outright from `src/lib/password.ts` rather than left disabled/unused —
nothing else referenced them, and dead code that looks like it's still
providing a security property it no longer provides is worse than no
code at all. Revisit if breach-checking is wanted again later; the
original entry above still documents the k-anonymity approach that
worked, should it come back.

### Usernames allow mixed case, made case-insensitively unique via a new usernameLower column
Trigger was a real, reproduced UX complaint: a member typed a mixed-case
username (`NashPopoB`) at registration and hit the native browser
validation error, since usernames were restricted to `[a-z0-9_]` only.
Simply relaxing the regex to allow uppercase was considered and rejected
on its own — usernames are public handles (profile URLs, discussion/fight
scene/badge attribution), and the existing uniqueness check was case
*sensitive*, so allowing mixed case without also fixing uniqueness would
let someone register `Admin` alongside an existing `admin` — two distinct,
nearly-identical-looking accounts, a classic impersonation vector on any
platform with public handles.

- **Case-preserving storage, case-insensitive uniqueness** — the standard
  pattern (GitHub/Twitter handles work this way): `username` keeps
  whatever case was chosen for display; a new `usernameLower` column
  (always `username.toLowerCase()`, written alongside `username` on every
  create) is the real uniqueness/lookup key. `username` itself dropped its
  own `@unique` constraint — it's no longer needed once `usernameLower`
  enforces case-insensitive uniqueness on its behalf.
- **Not done via Postgres `citext`**: considered making the column itself
  case-insensitive at the type level, which would need no application-code
  changes to lookups. Rejected — Prisma has no native support for `citext`
  (it would need `Unsupported("citext")`, which makes the field opaque to
  Prisma Client's typed query API), a real risk to the several existing
  `where: { username }` call sites for a "cleaner-looking" schema. The
  explicit-second-column approach mirrors how this codebase already
  handles the identical problem for email (`normalizedEmail`), so it's a
  known, already-proven pattern here rather than a new one.
- **Every case-sensitive lookup site found and converted, confirmed by an
  exhaustive grep, not assumed**: only three call sites actually queried
  by username rather than merely displaying it —
  `/api/register`'s existing-username check, `/members/[username]`'s
  profile lookup, and `generateUniqueUsername()`'s collision loop (used by
  Google sign-up). All three now key off `usernameLower`.
  `/members/[username]` resolving case-insensitively (`/members/nashpopob`
  and `/members/NashPopoB` both reach the same profile) is a deliberate
  consequence of this, not a separate feature — it falls directly out of
  the same lookup key change.
- **Migration mirrors the original `add_username` migration's backfill
  style** but needs no de-duplication pass: every pre-existing username
  was already restricted to `[a-z0-9_]`, so `lower(username) = username`
  for every existing row, and backfilling `usernameLower` from already-unique
  rows can't introduce a new collision the way the original migration's
  email-derived backfill could.
- **Verified end-to-end against a real registration, not just the schema**:
  registered `NashPopoB`, confirmed a second registration attempt with
  `nashpopob` and with `NASHPOPOB` both correctly rejected as "already
  taken," confirmed all three casings resolve to the same `/members/`
  profile and always display the original `NashPopoB` casing, and
  confirmed `generateUniqueUsername("nashpopob")` correctly detects the
  collision and suffixes to `nashpopob1`.

### Login switched from fetch-based signIn() to a Server Action with a native form
Two real, reported bugs shared one root cause: `/login` called
`next-auth/react`'s `signIn()` from a `fetch()`-driven `onSubmit` handler
(`preventDefault()`, POST via `fetch`, then a separate JS-triggered
navigation). Browsers only reliably offer to save credentials for a
genuine `<form>` POST that completes with a navigation — a
`fetch()`-intercepted submit doesn't look like a real form submission to
the password manager, so Chrome/Firefox never prompted to save. The same
split also caused a visible ~1s lag before the header reflected being
signed in, since the fetch and the follow-up navigation were two separate
round trips instead of one browser-orchestrated request.

- **Rebuilt `/login` as a Server Component (`page.tsx`) + Client Component
  (`login-form.tsx`) + Server Action (`actions.ts`)**, following the
  pattern Next.js's own App Router auth guide recommends
  (`<form action={serverAction}>` + `useActionState`) rather than
  hand-rolling CSRF token plumbing for a raw POST to Auth.js's
  `/api/auth/callback/credentials` endpoint — Server Actions get Next's
  built-in same-origin protection for free, and Auth.js v5's server-side
  `signIn()` (imported from `@/lib/auth`, not `next-auth/react`) is
  designed to be called directly from one.
- **Error handling**: `signIn()` throws `NEXT_REDIRECT` internally on
  success (Next's own mechanism for a Server Action to trigger a
  navigation) and throws `AuthError`/`CredentialsSignin` on failure. The
  action catches only `AuthError` and returns a message for
  `useActionState` to render inline; anything else is rethrown so the
  success redirect isn't accidentally swallowed.
- **`/register`'s post-signup navigation got a smaller, related fix**:
  it stayed fetch-based (registration also needs the JSON `/api/register`
  call and captcha token, not just a sign-in), but its post-success
  `router.push("/")` immediately followed by an unawaited `router.refresh()`
  had the same race as the login lag — if `/` was already prefetched while
  signed out, `push()` could paint that stale cached page before
  `refresh()`'s background re-fetch caught up. Swapped both for a single
  hard `window.location.href = "/"`, matching what login effectively does
  via its Server Action redirect.
- **Verified against a real dev server, not just lint/build**: Playwright
  against a local Postgres — wrong password stays on `/login` and shows
  the existing generic error; correct password redirects to `/` in ~500ms
  with the header immediately reflecting signed-in state; registration
  redirects to `/` the same way. Google OAuth sign-in (`next-auth/react`'s
  `signIn("google", ...)`, a redirect-based flow) was untouched — this
  only reworked the credentials path.

### `master` protected by a GitHub ruleset, no required review
GitHub itself flagged `master` as unprotected (force-push/deletion
possible, no required status checks). Site owner set up a branch ruleset
via the repo's Settings → Rulesets UI: PRs required to reach `master`,
force-pushes and deletion blocked, `build-and-lint` required to pass
before merge.

Deliberately **no required-approval review** — every PR in this repo is
already opened, CI-checked, and merged by Claude sessions working
autonomously in parallel, with no human approval step today. Requiring
reviews would block that entirely (including this session's own merges),
and the site owner explicitly confirmed no human-review gate is wanted.
"Require branches to be up to date before merging" was also left off —
with several PRs merging into `master` independently, that setting would
force a rebase/CI re-run on every PR each time another one lands first,
fighting the very workflow this repo runs on. Documented in `CLAUDE.md` so
future sessions know a direct push to `master` will now be rejected
outright, not just discouraged by convention.

### Reversed: Claude sessions no longer self-merge on green CI
Partial reversal of the entry above. The GitHub ruleset itself is
unchanged — no required-approval review at the GitHub level, PRs still
required, `build-and-lint` still required to pass. What changed is a
`CLAUDE.md` convention layered on top of it: an AI session working this
repo now opens a PR and **stops once CI is green**, rather than merging
immediately via the GitHub API.

Reason for the reversal: the original "no review needed" call assumed
CI passing was a sufficient merge gate. In practice the site owner wants
to preview the Vercel deployment and request adjustments before a change
lands on `master` — something a green `build-and-lint` run can't catch
(it verifies the code builds and lints, not that the feature looks or
behaves the way it's supposed to). A merge now requires the site owner
explicitly saying so in the conversation, not just a passing check.

Deliberately *not* re-enabling GitHub's own "require approvals" ruleset
setting to enforce this — that would mean clicking Approve in GitHub's
review UI for every PR, real friction for a workflow where "merge" typed
in chat is enough. This is a chat-convention gate, not a technical one;
if it turns out sessions need a stronger backstop later (e.g. one
forgets to wait), revisit adding the GitHub-side requirement too.

### Vercel preview deployments deleted on PR close, to stop Neon preview-branch pileup
**PR #88.** Found while debugging a build failure ("Branch limit reached")
on an unrelated PR: Vercel's Neon integration only deletes a preview
database branch when its *last associated Vercel deployment* is deleted —
not when the PR closes or the git branch is removed. Left to Vercel's own
deployment retention policy, that can take up to ~180 days by default (the
clock starts at deployment creation, not PR close). Checking the actual
Neon project confirmed the mechanism: all 10 of the Free plan's
per-project branch slots were consumed by `preview/claude/*` branches for
PRs merged days ago, blocking a new PR's deployment from provisioning at
all.

- **Added `.github/workflows/vercel-preview-cleanup.yml`**, triggered on
  `pull_request: closed` (merged or not) — calls Vercel's API to list and
  delete deployments for that PR's branch, which triggers Neon's cleanup
  webhook immediately rather than waiting on retention. No-ops with a
  warning (doesn't fail the PR) if `VERCEL_TOKEN`/`VERCEL_PROJECT_ID`
  aren't configured as repo secrets, since those have to be added manually
  via the Vercel/GitHub dashboards — not something a PR merge should block
  on if they're ever unset.
- **Also shortening Vercel's Pre-Production Deployment retention** (Project
  Settings → Security → Deployment Retention Policy) as a backstop for
  branches that never get a closing PR — but deliberately not down to
  Vercel's own minimum (1 day). This repo's own `CLAUDE.md` convention
  ("Wait for explicit 'merge' before merging a PR") has the site owner
  reviewing a live preview before merging, which can span more than a day;
  a 1-day retention would delete that preview out from under an
  in-progress review. Since the GitHub Action above already
  handles the common case (deletion the moment a PR actually closes),
  retention only needs to catch abandoned branches — a week-plus window
  keeps that safety net without racing the review workflow itself.
- **Hand-rolled `curl`/`jq` against Vercel's API rather than a marketplace
  GitHub Action** — avoids handing a third-party action's code access to
  `VERCEL_TOKEN` (a credential that can delete deployments) for something
  this small; the whole call is a handful of transparent lines in the
  workflow file itself.

### Weekly Trending Carousel's cron had never run — `CRON_SECRET` was never configured in Production
**Not a code bug.** Reported: the homepage's Weekly Trending Carousel (see
`README.md`) had shown the same movies since launch. `getFeaturedMovies()`
(`src/lib/weekly-featured.ts`) falls back to a static `ORDER BY
tmdbPopularity DESC` list whenever the `WeeklyFeatured` table is empty, and
that table is only ever written by `/api/cron/weekly-featured` — which
`isAuthorized()` gates behind `CRON_SECRET`, returning a plain 401 with no
alerting if that env var isn't set. It never had been: the Vercel project
had no `CRON_SECRET` configured in Production at all, so every scheduled
Monday cron invocation (and any manual one) had silently 401'd since launch,
and nothing surfaced that failure anywhere a person would see it.

- **Fix was operational, not a code change**: generated separate random
  values for `CRON_SECRET` in Production and Preview (deliberately
  different — Vercel's scheduled cron only ever invokes Production, and
  each preview deployment already has its own isolated Neon database
  branch, so a leaked Preview value can't touch production data anyway;
  no reason to share the value regardless). Configured both in Vercel's
  Environment Variables, then manually triggered
  `/api/cron/weekly-featured` once via `curl` to backfill `WeeklyFeatured`
  immediately instead of waiting for the next scheduled Monday run.
- **The debugging dead-end that cost the most time**: repeated
  `{"error":"Unauthorized"}` responses even after setting the secret and
  clicking "Redeploy," which looked like a value mismatch (copy-paste
  whitespace, wrong environment scope, stale deployment) and was
  extensively ruled out as each of those individually — scope was
  confirmed correct in the dashboard, a hand-typed trivial value
  (`test123`) on both sides still failed, and Vercel's Logs panel
  confirmed the failing requests really were hitting the current
  Production deployment (`Environment: production`, `Branch: master`) and
  executing cleanly, not being intercepted by a proxy or hitting a stale
  deployment. **The actual cause was simpler and easy to miss**: each
  "Redeploy" click was checked against the *previous* curl attempt before
  that specific redeploy had actually gone `Ready` — comparing Vercel's
  Logs panel Deployment ID against a fresh redeploy's own Deployment ID
  (not just eyeballing "I clicked redeploy already") is what finally
  confirmed a genuinely-new deployment, and only *that* one had the
  secret live.
- **Verified end-to-end, not just "no more 401"**: the successful curl
  response (`{"weekStart":"2026-08-17T00:00:00.000Z","movieIds":[...]}`)
  confirms `computeWeeklyFeatured()` actually ran and wrote real ranked
  data, not just that auth passed.
- Nothing about `computeWeeklyFeatured()`, `vercel.json`'s cron schedule,
  or `isAuthorized()` needed to change — this was purely a missing
  deployment-environment secret, invisible because the endpoint fails
  silently (a 401 with no alerting) rather than surfacing anywhere an
  operator would notice a launch-day misconfiguration.

### Preview database made static across PRs, trading back the migration-collision risk to stop re-seeding every branch
**Infra-only change — no PR, no code diff.** Decided while staging a
throwaway preview for the swipeable-fight-scenes backlog item: the
per-branch Neon isolation from "Production migration incident" above means
every new PR starts from a completely empty database, so getting an admin
login and any real content into a preview meant re-running `prisma db seed`
(or a manual SQL `UPDATE` for the account, plus manual data entry) on every
single new branch. Decided that cost was worse than the risk it was
protecting against for this project's actual pace of parallel work.

- **What changes**: the Neon integration's per-git-branch auto-provisioning
  is turned off for the Preview environment. One dedicated, long-lived Neon
  branch (seeded once) is used for every preview deployment from here on,
  via a static `DATABASE_URL` scoped to the Preview environment only —
  the same pattern Production's own `DATABASE_URL` already uses (a
  manually-set variable, narrowed to one environment), just applied to
  Preview too.
- **Production stays fully isolated** — this only merges Preview with
  itself across PRs, not with Production. The original incident (one
  connection string doing double duty for *both*) is not being
  reintroduced.
- **The tradeoff, explicitly accepted, not overlooked**: concurrent
  unmerged PRs with different pending schema migrations now race against
  the same shared tables again — the exact mechanism the per-branch
  isolation was built to prevent. Mitigation is leaning harder on this
  file's own "Stay in sync with master" and schema-touching-PR conventions
  in `CLAUDE.md`, since Preview no longer absorbs that collision silently.
- **`vercel-preview-cleanup.yml` still applies, just for a narrower job**:
  it keeps deleting stale Vercel deployments on PR close (so the Neon
  Free-plan branch-count limit from that same incident doesn't get
  re-triggered by deployment pileup), but no longer cascades into deleting
  a Neon branch, since no single deployment owns the shared one anymore.

## Feature Decisions

### Editorial Reviews opened up to members as "Reviews," admin review kept separate
**PR #TBD.** Renamed the section (and its heading) from "Editorial Reviews" to "Reviews"
and let verified members add their own, alongside the existing admin-only review.

- **New `MemberReview` model, `EditorialReview` left untouched** — rather than adding an
  `authorRole`/`isAdmin` flag to `EditorialReview` and changing its semantics from
  "one shared row per movie" to "one row per author." `EditorialReview` already has a
  dependent: the homepage's "Recent Reviews by Editors" grid (`getRecentEditorialReviews`
  in `src/lib/editorial-reviews.ts`) specifically surfaces admin-authored reviews, and
  reworking its one-row-per-movie assumption to accommodate members would have meant
  updating that query's semantics too, for a feature that was explicitly asked to keep
  admin and member reviews as two distinct kinds, not one merged pool.
- **`MemberReview` is one row per (movie, member) pair** (`@@unique([movieId, authorId])`),
  matching `Rating`'s one-review-per-member convention — a member edits their existing
  review in place (`PATCH`) rather than posting additional ones, and a second `POST`
  attempt is rejected with a 409 pointing them at editing instead.
- **Hard-deleted, not soft-deleted** — the established soft-delete convention
  (`FunFact`, `DiscussionPost`) exists to keep something a vote or reply depends on
  intact; nothing depends on a `MemberReview` row surviving deletion, so it's a plain
  `delete()`, no `isDeleted` column.
- **5,000-character cap**, between `EditorialReview`'s 10,000 (admin, presumably more
  polished/longer) and `FunFact`'s 500 (a one-line trivia snippet) — long-form enough for
  an actual review, without matching the admin review's ceiling.
- **Admin review always renders first, in its own bordered box labeled "Admin Review"**
  (amber-accented, same family as `AdminRatingWidget`'s existing amber styling elsewhere
  on the page) — member reviews sort newest-first below it, so the one "official" review
  is visually unambiguous at a glance.
- **An admin can also write their own `MemberReview`**, separate from the shared admin
  review they edit — not specifically requested, but nothing in the spec excluded it, and
  restricting admins from having a personal take in addition to the official one would
  have needed extra gating logic for no clear benefit.
- **Member reviews display as a horizontal scroll rail of cards, not a vertical list** —
  requested as a follow-up once a vertical stack of several reviews showed the same
  unbounded-page-growth problem already solved for Fun Facts, but a "show more" toggle
  didn't fit card-shaped review content as well as it fit a flat trivia list. Reused the
  existing `rail-scrollbar` utility (already backing Cast and You Might Also Like) instead
  of inventing new overflow handling, with each card a fixed `w-72` and its own
  `MemberReviewCard` sub-component holding local expand state. Long card text clamps at
  `CARD_CLAMP_THRESHOLD = 160` chars (vs. `RecentReviewsFeed`'s `ReviewText` clamp at 220),
  scaled down to fit the narrower card width, reusing that component's clamp/"Show
  more"-"Show less" pattern rather than a new one.

### Member reviews get voting, capped rail, and a paginated overflow page
**PR #TBD.** Follow-up once the rail itself was identified as only moving the
unbounded-growth problem sideways (unlimited horizontal scroll instead of unlimited
vertical stacking) — capped the movie page's rail and added somewhere for the rest to go,
plus member voting on top.

- **Rail capped to `MEMBER_REVIEWS_PREVIEW_COUNT = 2`** on the movie page itself, with a
  **"View all N reviews →"** link (shown once the total exceeds 2) to a new
  `/movies/[id]/reviews` page — same `?page=` + `skip`/`take` pagination pattern as the News
  archive (`NEWS_ARCHIVE_PAGE_SIZE`), at `MEMBER_REVIEWS_PAGE_SIZE = 10`. That page renders
  every review's full, unclamped text — a plain vertical list, not a rail, since a dedicated
  "read everything" page is exactly the case a rail is the wrong shape for.
- **Voting reuses the `FunFactVote` toggle model exactly** (`MemberReviewVote`, one row per
  (user, review), +1/-1, same-direction-again retracts, opposite-direction switches) — a
  member can't vote on their own review, mirroring "can't vote on your own fun fact."
- **Sort key changed from newest-first to net vote score (ties broken by newest)**, matching
  `FunFactsSection`'s `byNetScore` — necessary once votes exist at all, since "most helpful"
  is a better ordering for what shows in a 2-slot preview than "most recent."
- **`MemberReview.voteScore` is a denormalized, kept-in-sync column, not an in-memory
  groupBy** — the difference from `FunFact`, which just fetches every fact for a movie and
  sorts client-side after computing scores in memory (`getFunFactVoteSummaries`). That
  works because Fun Facts aren't paginated at the DB level; member reviews now are, and
  `skip`/`take` needs a real sortable column to page against, not a value computed after
  the page's already been sliced. The vote endpoint recomputes and writes it on every vote.
- **The movie page no longer fetches every member review just to check "have I already
  reviewed this."** That check moved to its own `findUnique` by the `(movieId, authorId)`
  unique constraint, decoupled from the preview rail's `take: 2` query — the two were
  fetching different things (one row belonging to the viewer vs. the top-scored rows for
  display) that happened to share a table before pagination made that conflation costly.

### Fun Fact mentions auto-link against a per-movie pool, not an @mention input
**PR #TBD.** Wanted fun facts to be able to reference the movie's cast (or other movies
in the same franchise) as links, without requiring people writing a short trivia snippet
to learn or use any special syntax.

- **Automatic text matching over an `@mention` autocomplete.** An explicit mention syntax
  (type `@`, pick from a dropdown) would eliminate ambiguity entirely, but needs real UI
  work (an autocomplete component) for a feature whose whole appeal is a plain one-line
  textarea. Automatic detection means anyone typing a cast member's name in prose gets a
  link for free.
- **Matched only against this movie's own cast list and its `collectionTmdbId` siblings**
  (`funFactMentionables` in `movies/[id]/page.tsx`), not the whole site's `Person`/`Movie`
  tables. A site-wide match pool would risk false positives from common names or
  incidental substring matches; a single movie's cast (typically ~30, capped at
  `MAX_CAST`) is small and specific enough that an exact name match is almost always a
  genuine reference.
- **Longest-name-first matching** (`linkifyContent` in `fun-facts-section.tsx`) so a full
  name like "Bruce Lee" is consumed whole rather than a shorter substring (e.g. a
  hypothetical cast member surnamed "Lee") matching part of it first.
- **List rows switched from `<button>` to `<div role="button">`** to legally nest an `<a>`
  inside a clickable row — nesting anchors inside buttons is invalid HTML and behaves
  unpredictably across browsers. The row's own click handler checks `e.target.closest("a")`
  and defers to the link instead of also spotlighting the row.

### Fun Facts list collapsed behind "Show all N" to cap the section's default footprint
**PR #TBD.** The spotlight + paginated-list design (see the original Fun Facts entry
below) already capped the section's height regardless of how many facts a movie
accumulates, but the list was always visible by default, so the section's own footprint
was still fairly heavy for a secondary feature, particularly as the movie page picked up
more sections over time (You Might Also Like, the Details sidebar, etc.). The list and its
pagination controls now render only after clicking "Show all N fun facts" — the spotlight
(with prev/next, voting, edit/delete) stays visible unconditionally, since prev/next lets
someone browse every fact one at a time without needing the list at all, and removing it
wouldn't have saved any height anyway.

- **Considered shrinking the spotlight itself to a one-line teaser** for an even smaller
  default footprint, but that would have lost the spotlight's visual presence (the quote
  styling, vote buttons) entirely until expanded — kept the full spotlight card instead,
  since the actual space savings come from hiding the list, not the spotlight.
- **Toggle only appears when there's more than one fact.** With a single fact, the
  spotlight already shows everything there is to show — a "Show all 1 fun facts" toggle
  would just be a dead click.

### "You Might Also Like" built from our own data, not TMDB's recommendations endpoint
**PR #TBD.** TMDB offers `/movie/{id}/recommendations` and `/movie/{id}/similar` for free,
but both reflect TMDB's general-audience similarity model, not this catalog's data or its
genre focus — a real risk on a niche single-genre site, where "similar" by TMDB's
standards could easily mean "action movie from the same decade" rather than "another kung
fu film." Built `getSimilarMovies` (`src/lib/similar-movies.ts`) instead, scoring every
other `APPROVED` movie by three signals already in the catalog and summing weighted
matches: shared genres (+2 each), shared cast or director (+3 each), and same
`collectionTmdbId` (+10). Top 8 by score, ties unresolved (no secondary sort — acceptable
for a rail, not a ranked list).

- **Collection weighted heaviest, genre lightest.** Two movies in the same franchise are
  the strongest possible same-movie-again signal; shared genre is the weakest, since this
  catalog is genre-homogeneous by design (nearly everything in it is Action + Martial
  Arts), so almost every pair of movies already shares at least one genre and it
  shouldn't dominate the ranking on its own.
- **In-memory scoring over a single-query composite ranking** — same tradeoff already
  established for Top Curators and fuzzy-search ranking: fetch the candidate pool (movies
  matching *any* of the three signals via one `OR` query) then score/sort in JS, rather
  than one large SQL expression. Fine at this catalog's size; would need revisiting if the
  catalog grew by orders of magnitude.
- **A movie with zero shared signals against the rest of the catalog gets no rail at all**,
  not an empty section or a "nothing similar yet" placeholder — the homepage's `MovieRail`
  supports an `emptyMessage` for exactly that case, but it wasn't used here since an empty
  "You Might Also Like" on a movie page reads as a bug, not a legitimate empty state the
  way "no community ratings yet" does on the homepage.

### Five more TMDB fields captured: tagline, studio, US certification, revenue, and collection
**PR #TBD.** Added to every import (`importMovieFromTmdb`, shared by all three admin
import paths and member submissions): `tagline`, primary `studio`, `certification`,
`revenue`, and franchise `collectionName`/`collectionTmdbId`. Also raised the top-billed
cast cap from 15 to 30.

- **Studio and collection are plain scalar fields, not relations** — same
  not-a-relation tradeoff already made for `director`/`country`: nothing needs to query
  "movies by studio" yet, and `collectionTmdbId` alone is enough to look up sibling
  movies already in the catalog (`@@index([collectionTmdbId])`) without a join table. If
  a `Studio` or `Collection` model with its own page ever becomes worth building, this is
  cheap to migrate off of.
- **Revenue stored as `Int`, not `BigInt`.** TMDB reports revenue in whole USD, and a
  handful of best-known martial arts films — Crouching Tiger, Hidden Dragon topped out
  around $213M — are nowhere close to `Int`'s ~2.147B ceiling. `BigInt` would have meant
  handling its non-JSON-serializable-by-default quirk at every server/client boundary
  (same category of problem `Date` already needs `.toISOString()` for) for a genre where
  it'll never matter.
- **Only US certification is surfaced**, via `extractUsCertification` in `src/lib/tmdb.ts`
  picking the first non-empty `certification` from TMDB's `release_dates.results` entry
  for `iso_3166_1 === "US"`. TMDB's per-country certification data is inconsistent enough
  across regions that merging multiple systems (PG-13 vs 15 vs IIB, etc.) wasn't worth it
  for a site whose existing conventions (English titles, US-style rating expectations)
  are already US-centric.
- **`revenue: 0` and `tagline: ""` are normalized to `null` at import time.** TMDB uses
  `0`/`""` to mean "no data" far more often than "actually zero" for the older and
  non-US-major titles this catalog cares about, so displaying a literal "$0" or an empty
  quote line would read as wrong more often than it'd read as true.
- **Studio, country, language, revenue, and collection moved into a sidebar "Details"
  card under the poster, out of the header's flowing meta line/paragraphs.** Compared
  three layouts head to head (a details grid below the overview, this sidebar card, and
  an icon-glyph strip folded into the meta line) once actual page content — recommend
  badges, Fight Count, Community/Editors scores, subcategory ratings — was mocked in
  alongside each, not just the new fields in isolation. The grid-below-overview option
  read cleanest under that full weight; the icon strip degraded the most (Fight Count
  alone pushed it to wrapping two lines). Went with the sidebar card anyway, since it
  keeps the main column's narrative flow (title → tagline → meta → genres → scores →
  overview) completely uninterrupted — the accepted tradeoff is that the sidebar card
  can end up shorter than the main column on a movie with a longer overview or more
  rating data, leaving visible empty space under it; not fixed, since there was nothing
  else waiting to fill that space.
- **Not retroactive.** Existing movies keep `null` for all five fields until their next
  re-import — same limitation `lastSyncedAt` already implies for any field added after a
  movie was first imported. No backfill script was written; re-importing is already a
  supported action from `/admin/import`.

### Fight scene permalink page redesigned as a standalone destination, not the movie-page card lifted out
**PR #TBD.** `/movies/[id]/fight-scenes/[fightSceneId]` used to just wrap the same
`FightSceneSection` card shown in a movie's fight-scene grid, plus a back-link and OG
metadata — fine for link-preview purposes, but nothing about the page itself
distinguished "you clicked through from a list" from "you landed here directly from a
shared link or `/search/fight-scenes`."

- **`FightSceneSection` gained a `detail` prop rather than a parallel component.**
  Rating, favoriting, admin tools, editing, verification, and start-time control are
  all interactive state already owned by that one component; forking a second
  component to get a different layout would have meant keeping two copies of that
  logic in sync. `detail` only changes three things inline — the video grows to full
  card width instead of the small inset, the round label becomes "Round N of (total)"
  with prev/next links, and `ShareButton` gets a `youtubeUrl` prop — everything else
  (rating row, admin tools, edit/delete) renders unchanged. Grid usage (the movie page)
  passes no `detail` prop and is pixel-identical to before.
- **Cast pills and the "more fights" rail are demoted, not equal-weight sections.**
  Early drafts gave both their own full headline and card-sized entries, which pulled
  focus back toward "browse the catalog" — working against the reason someone lands on
  a permalink in the first place (watch *this* fight). Settled on small muted labels,
  single-row scrolling strips, and a hairline divider separating them from the scene
  above, so they read as an available exit, not a second act.
- **Share menu gained "Copy YouTube link," not a second "copy link with timestamp."**
  The app's own permalink already opens at the clip's stored start time (the embed
  always uses `youtubeStartSeconds`), so a second copy option pointing at the same URL
  plus a redundant `t=` param would have added a confusing near-duplicate. The real gap
  was no way to share the *source* YouTube link directly — added via
  `youtubeWatchUrl(videoId, startSeconds)`, only shown when `ShareButton` is given a
  `youtubeUrl` (i.e., only in `detail` mode).
- **`FightSceneThumbnail`'s image+fallback logic split into `YoutubeThumbnailImage`**
  so the "more fights" rail could reuse the same 404-fallback behavior at a much
  smaller size than the card-sized thumbnail `FightSceneThumbnail` and
  `FightSceneResultCard` need — without duplicating the `onError` state logic.

### Fight scene search browses by default instead of requiring input first
**PR #TBD.** `/search/fight-scenes` previously showed nothing — just "Enter a
scene or movie title, or set a filter, to browse fight scenes" — until a
query or filter was set, exactly mirroring `/search` (movies)'s gated
behavior. Landing on a page titled "Browse fight scenes" via the nav and
seeing an empty form instead of anything to browse was the actual complaint.

- Fixed by removing the `if (searched)` gate on the query — it now always
  fetches (`isDeleted: false`, no other filters applied when none are set),
  sorted Newest by default, same pagination as before.
- **Deliberately not applied to `/search` (movies) too** — this was scoped to
  the specific complaint about the fight-scenes page, not a "fix both"
  pass. The two pages diverging here (fight scenes browses by default,
  movies still requires input) is a known, accepted asymmetry, not an
  oversight — revisit if `/search` gets the same complaint.
- The empty-result copy now distinguishes the two states: "No fight scenes
  have been added yet" (true empty catalog, no query/filters) vs. "No fight
  scenes matched your search" (a query or filter narrowed it to zero) —
  previously only the latter message existed, since the unfiltered case
  never reached the results branch at all.

### Fight scene search gets quick-filter bubbles, scoped to fixed-value filters only
**PR #TBD.** A one-click bubble row above the results, for jumping straight
into a filtered/sorted view without opening the sidebar form.

- **Which filters got a bubble, and why the actor filter didn't**: bubbles
  cover every category tag plus two sort shortcuts (Top Rated → highest
  member rating, Most Favorited) — all fixed, enumerable value sets. The
  actor filter stayed sidebar-only (its existing `AutocompleteFilterInput`)
  since it's open-ended text; a bubble row can represent "pick one of these
  N things" but not "type anything." Editor rating didn't get its own sort
  bubble to keep the row from getting crowded — member rating ("Top Rated")
  is the more general-audience reading of that phrase; editor rating stays
  reachable via the sidebar's sort dropdown.
- **Clicking a bubble replaces the current filters rather than adding to
  them** — same one-click-to-a-specific-view behavior as the existing
  genre/tag quick-links elsewhere in the app (`/search?genre=`,
  `/search/fight-scenes?tag=`), not a toggle that combines with whatever
  else is currently selected.
- Active-state highlighting reads the same `selectedTags`/`sort` values the
  sidebar form already computes, so a bubble and its sidebar counterpart
  (the matching tag checkbox, the matching sort option) always agree on
  what's currently active — no separate state to keep in sync.

### Fun Facts: flat content shape from Discussion, first bidirectional vote in the app
**PR #TBD.** An IMDB "Did you know"-style trivia section above the Discussion
thread — members add short entries, other members vote them up or down.

- Content shape (`content` + `isDeleted` soft delete) mirrors `DiscussionPost`
  directly, minus the `parentId`/`replies` threading — a fun fact is a flat
  list, there's no concept of replying to one.
- **Voting is the first bidirectional (up/down) pattern in the codebase.**
  Every existing vote-like mechanic is one-directional: `MemberListLike` is a
  toggle-on/toggle-off like with no dislike, and `Rating`/`FightSceneRating`
  are 1–10 scores, not votes. `FunFactVote.value` (+1/-1) with a
  `@@unique([userId, factId])` constraint reuses `MemberListLike`'s
  toggle-to-retract behavior in both directions: voting the same way twice
  retracts it, voting the other way switches it.
- **Ranked by net score, computed in memory** — same tradeoff already made
  for Top Curators and fuzzy-search ranking: `groupBy(["factId", "value"])`
  gives per-fact up/down counts, and the up-minus-down sort happens
  server-side after that, not as a single SQL aggregate.
- **Self-voting blocked**, matching `MemberListLike`'s self-like block, for
  the same reason — stops a submitter inflating their own fact's score.
- **Soft-deleted facts are excluded server-side** (`isDeleted: false` in the
  query), unlike discussion posts, which stay visible as "[deleted]"
  indefinitely because replies can hang off a deleted parent and need
  somewhere to render. A fun fact has no replies, so once it's gone there's
  nothing depending on the row staying visible — it's simply excluded on
  reload, and the client removes it from the list immediately on delete
  rather than showing a placeholder that would only ever appear pre-refresh.
- **500-character cap**, well below `MAX_DISCUSSION_CONTENT_LENGTH` (5000)
  — a fun fact is meant to be a short, scannable trivia snippet, not a full
  post.

### Community Activity feed merges three existing tables, no new schema
**PR #65.** Backlog ask was for a homepage strip surfacing recent member
activity to make the site "feel alive" — deliberately scoped to be cheap:
query recent rows across existing tables rather than introduce an
`ActivityLog`/event-sourcing table.

- Three event types, chosen because each already has a natural "who did
  what, when" shape with no extra state needed: a `FightScene` created, a
  `MemberList` created, and a top-level `DiscussionPost` created (replies
  excluded — a reply isn't "starting" a discussion). Ratings and likes
  were considered and dropped: they're per-user upserts with no reliable
  single "created" moment to point at (a rating can change), so they'd
  need either a separate history table (violates the no-new-schema goal)
  or showing a merely-updated rating as if it were new (misleading).
- Each event type is queried independently — Prisma doesn't support
  cross-model UNIONs without raw SQL, and three cheap indexed queries (each
  already sorted by an indexed/default-ordered `createdAt`) is simpler than
  hand-writing and maintaining raw SQL for what's ultimately a lightweight
  homepage widget.
- Reuses the exact pending-movie visibility rule already established
  everywhere else (search, homepage rails, weekly-trending): a fight scene
  or discussion tied to a movie still awaiting admin approval is excluded
  until the movie goes live, so the feed can't leak a pending submission
  through a side door.
- Placed at the very bottom of the homepage, below Recent Reviews by
  Editors (moved there by explicit direction after initially sitting above
  Recent Reviews) — the last section on the page rather than competing
  with the movie rails or the trending carousel for above-the-fold
  attention.

**Reworked from one merged/sorted list to three grouped columns, in
preview (same PR).** The first version merged all three event types by
`createdAt` into a single flat top-8 list, styled as plain text sentences.
Feedback on the preview was that this was both too plain (no visual weight
beyond a line of text) and had the wrong content mix (a burst of one event
type — e.g. several fight scenes tagged close together — could crowd the
other two types out of the top 8 entirely, so "Community Activity" didn't
reliably read as covering the whole community). Reworked to three
independently-limited columns (`take: 3` each, not merged), one per event
type, so every type is guaranteed visibility regardless of how bursty any
one type's activity is. Each row became a bordered card reusing Recent
Reviews by Editors' poster-thumbnail-plus-byline layout (for the two
movie-linked types) rather than a plain sentence, for visual parity with
the site's other homepage feed section.

### Error monitoring added without wrapping next.config.ts in Sentry's build plugin
**PR #TBD.** Closes a real gap: server errors were already visible via
`console.error` (captured in Vercel's function logs), but a client-side
crash — a React render error, an uncaught browser exception — had zero
visibility beyond whoever happened to have their console open.

- **Native Next.js instrumentation hooks over Sentry's setup wizard**:
  `src/instrumentation-client.ts` and `src/instrumentation.ts`'s
  `onRequestError` export are Next's own file-system conventions (stable
  since Next 15.3/15.0 respectively, confirmed against this repo's actual
  installed Next version's bundled docs rather than assumed from training
  data — this Next.js version's own `CLAUDE.md`-injected warning exists
  specifically because APIs like this have moved). Sentry's SDK plugs into
  them (`Sentry.init()`, `Sentry.captureRequestError`,
  `Sentry.captureRouterTransitionStart`) rather than needing its own
  competing convention.
- **`next.config.ts` deliberately not wrapped with `withSentryConfig`**:
  that wrapper's main jobs are build-time source-map upload (needs a
  `SENTRY_AUTH_TOKEN`) and some auto-instrumentation. Making the build
  depend on that token would break `README.md`'s documented guarantee that
  `npm run build` needs no secrets — true for every contributor and every
  parallel PR today, not just this one. Verified directly, not assumed:
  ran `npm run build` with no `SENTRY_DSN`/`NEXT_PUBLIC_SENTRY_DSN` set at
  all (matching CI's actual environment) before considering this done.
  Traded off: Sentry shows real stack traces, just against deployed
  (minified) JS rather than original source, until someone decides
  readable production stack traces are worth wiring `SENTRY_AUTH_TOKEN`
  into CI as a real secret.
- **Fails open, same pattern as every other optional integration**:
  `Sentry.init()` only runs when `SENTRY_DSN`/`NEXT_PUBLIC_SENTRY_DSN` are
  set; unset means the SDK never initializes and nothing about local
  dev/CI/app behavior changes, matching Resend/Blob/Upstash/Turnstile.
- **`src/app/error.tsx` added alongside, not left for a later pass**: a
  route-level error boundary was the other half of "client errors are
  invisible" — reporting a crash to Sentry doesn't help the member looking
  at a broken page in front of them. Reports to Sentry (when configured)
  on top of the existing `console.error`, not instead of it.
- **CSP `connect-src` allowlists Sentry's US-region ingest domain
  specifically** (`*.ingest.us.sentry.io`), not a wildcard — consistent
  with how `img-src`/`frame-src` already allowlist specific known hosts
  rather than broader patterns. An EU-region Sentry org needs this domain
  swapped, documented in `README.md` rather than guessed at, since getting
  it wrong silently CSP-blocks every client error report with no visible
  symptom beyond errors just never arriving.

### Search substring queries got their own trigram indexes, separate from the fuzzy-search ones
**PR #TBD.** Found while auditing indexes ahead of catalog growth, not
reported as a bug: every `contains`/`insensitive` search (navbar search,
both search pages, the director/actor autocomplete endpoints) was running
with no usable index at all, despite `Movie.title`/`Movie.director`
already having trigram indexes from the earlier fuzzy-search migration.

- **Root cause confirmed via Prisma's actual generated SQL, not assumed**:
  captured it directly with query-event logging — `contains` +
  `mode: "insensitive"` compiles to `column ILIKE ('%' || $1 || '%')` on
  Postgres, not `lower(column) LIKE lower($1)`. The existing trigram
  indexes were built on the `lower(...)` expression specifically for the
  fuzzy fallback's `similarity(lower(...), ...)` calls — a different
  expression, so Postgres can't substitute them for a plain `ILIKE` query.
  Confirmed with `EXPLAIN` (`SET enable_seqscan = off` to force the
  planner's hand): `Movie` fell back to a post-filter scan past the
  `status` index, and `Person.name` — which had only a plain btree index,
  useless for a leading-wildcard `ILIKE` — forced a full Seq Scan outright.
- **New indexes are plain, not `lower()`-wrapped, and kept separate from
  the existing ones rather than replacing them**: `pg_trgm`'s GIN opclass
  supports the `~~*` (ILIKE) operator directly on an unwrapped column, no
  expression needed. Added one each for `Movie.title`, `Movie.director`,
  `Person.name`, `FightScene.title` — every column actually queried via
  `contains` — without touching the original `lower(...)` ones, since
  those still serve the fuzzy fallback's `similarity()` calls. Accepted
  the modest write/storage overhead of two trigram indexes on the same
  column over trying to force one index shape to cover both query
  patterns.
- **Verified the new indexes are real, not just declared**: same
  `EXPLAIN`/`enable_seqscan = off` technique confirmed both `Movie.title`
  and `FightScene.title` queries now hit `Bitmap Index Scan` on the new
  indexes. At the catalog's current seed-data size the *unforced* planner
  still picks a sequential scan anyway — correctly, since scanning a
  handful of rows directly is cheaper than consulting an index — so this
  doesn't change anything observable today. It's there for when the
  catalog grows past the point where that's still true, which requires no
  further action when it happens.

### Fight Count: single member-editable field, not an aggregate — with guardrails to compensate
**PR #TBD.** Prompted by a real accuracy complaint about the "N fight
scenes cataloged" stat (added just before this): it counts *tagged clips*,
not actual fights in the movie, and for almost any film it undercounts
badly, since tagging a scene requires a member to notice it, clip it, and
submit a YouTube link. There's also no external source of truth for "how
many fights does this movie have" — TMDB doesn't track it — so any fix has
to be community-maintained.

Two designs were discussed:

- **Aggregate model** (what was recommended first): one row per
  `(userId, movieId)` holding that member's own count estimate, matching
  the exact shape `Rating`/`SubcategoryRating` already use, displayed as a
  median across submissions. Same epistemic honesty as Community Score
  (a labeled crowd estimate, not a claimed fact), and architecturally
  free — it's a pattern this codebase has already built three times.
- **Single mutable field** (what shipped): `Movie.trueFightCount`, one
  value, any verified member can overwrite it directly, last edit wins.
  Explicitly chosen over aggregation for simplicity — no median math, no
  "3 members disagree" UX, no partial-submission states to design around.

The single-field model was a deliberate, informed tradeoff, not a shortcut:
it gives up consensus/outlier-resistance that the aggregate model would
have had for free. Left completely unguarded, that combination (anyone can
overwrite a bare number, no trail, no bounds) is arguably *worse* than the
undercounting problem it replaces — a bad edit is invisible and
unrecoverable, versus an honestly-undercounted number that's at least
consistent. Four guardrails close that gap without reintroducing
aggregation:

- Editing requires a verified email (same bar as fight scene/movie
  submission); ADMIN/REVIEWER are exempt from that specific check, same as
  every other admin-gated action in this app trusts the account itself.
- Value is bounds-checked (0–20) server-side.
- Edits are rate-limited via the same Upstash limiter used for other
  content-mutation endpoints (`fightCountEditLimiter`).
- Every edit is logged to a new `FightCountEdit` table (movie, editor,
  previous value, new value, timestamp) and the history is shown to
  *everyone* on the movie page, not gated to admins — since the field has
  no approval step, any member noticing a bad value is the moderation
  mechanism, not just staff. This table exists purely as an accountability
  trail; it is not a second source of truth and nothing reads from it to
  compute the displayed count.

### Subcategory rating widget: progressive reveal + star picker, now on both member and admin widgets
**PR #TBD.** Follow-up to the subcategory ratings feature below, before it
shipped — the initial member widget (three stacked rows of ten number
buttons, always visible under the overall picker) read as visually busy on
review. Landed here after comparing several options live via screenshots
with the user, iterating rather than guessing at a single "obviously
correct" design. Originally shipped member-widget-only (see the "left
unchanged" bullet below); extended to `AdminRatingWidget` in a same-PR
follow-up once the user asked for parity, rather than needing a second
comparison pass — the design itself was already settled, just not yet
applied to the second widget.

- **Progressive reveal**: the "Rate by category" section now only renders
  once `score !== null` — i.e. once the member has rated the movie
  overall. Considered collapsing it behind a manual toggle instead (same
  declutter effect) — went with tying it to an action the member has
  already taken over a toggle they'd have to notice and click, since it
  needs no extra affordance and nothing users don't ask for stays hidden
  forever if they never rate at all.
- **5-star half-click picker over ten number buttons**: `StarRatingPicker`
  (`src/components/star-rating-picker.tsx`) reuses the same half-star
  mechanic as the existing search-filter rating picker
  (`RatingStarInput`) — 5 stars, click the left/right half for the
  odd/even value — so it's still a full 1–10 scale under the hood, just
  lighter chrome than 10 square buttons per row. Considered actually
  narrowing categories to a 1–5 scale to cut the number of choices —
  rejected: it would've needed different validation bounds than the
  overall score and made the numbers hard to compare at a glance
  wherever they appear together (the breakdown line, admin panel), for a
  friction reduction the star picker already delivers without touching
  the data model.
- **Shared `StarIcon` extracted, `RatingStarInput` refactored to use
  it**: both the search-filter picker and the new category picker draw
  the same star SVG: rather than duplicate the path string a second
  time, `src/components/star-icon.tsx` now owns it and
  `rating-star-input.tsx` was refactored to import from there instead of
  defining its own local `Star`. Pure extraction, no behavior change —
  verified the filter sidebar renders identically before and after via
  screenshot.
- **Admin (Editors' Score) widget initially left unchanged, then given
  parity**: the redesign was first previewed and approved for the
  member-facing widget only, so `AdminRatingWidget` shipped keeping its
  original always-visible number-button rows. Extended to match on
  request: `StarIcon` and `StarRatingPicker` both gained an optional
  `fillColorClassName` prop (default the site's yellow) so the admin
  panel's stars render amber, matching its existing amber theme, rather
  than introducing a second star component or hardcoding yellow into a
  shared one.
- **Admin reveal triggers on local selection, not on save**: unlike the
  member widget (where `score` only becomes non-null after a successful
  save — there's no separate save step), `AdminRatingWidget`'s overall
  score is a local, editable value that only reaches the server when
  "Save editors' rating" is clicked. Reusing the identical `score !==
  null` gate means the category section appears the moment an admin
  picks a number, before saving — accepted as the more natural reading of
  "once you've rated overall" for a workflow that already separates
  picking a value from committing it, rather than adding a second,
  save-specific condition that the member widget doesn't have.
- **Fetch failures now handled in both widgets, not just the member
  one**: while extending the redesign, `AdminRatingWidget`'s `handleSave`
  and `handleRateCategory` were also wrapped in try/catch (previously
  neither had one, and the widget had no error UI at all — a failed
  request failed completely silently). Matches the same fix already
  applied to `RatingWidget` after a report that a rating appeared to
  "not save" with no explanation, which turned out to be an unrelated
  stale preview-deployment URL, but the missing error handling it
  surfaced was real regardless and worth closing in both widgets while
  already touching this file.

### Subcategory ratings: supplement the overall score, fixed category list, movies only
**PR #TBD.** Members and admins can now rate a movie by category (Fight
Choreography, Story, Acting) in addition to the existing overall 1–10 score.
Several judgment calls, made explicit with the user before building rather
than guessed:

- **Supplement, not replacement**: the overall score (`Rating`/`AdminRating`)
  is untouched — category ratings live in new `SubcategoryRating`/
  `SubcategoryAdminRating` tables, unique on `[userId, movieId, category]` /
  `[adminId, movieId, category]`. A member can rate overall, by category,
  both, or neither; the Community Score/Editors' Score aggregates are not
  derived from category averages. Considered computing the overall score as
  an average of categories, and dropping the standalone score entirely —
  rejected both: purely additive was the lowest-risk option and the
  overall score is a well-established, independently-understood number members
  already rely on.
- **Fixed, hardcoded category list, not an admin-configurable taxonomy
  table**: `RATING_CATEGORIES` in `src/lib/ratings.ts` is a small constant
  (`FIGHT_CHOREOGRAPHY`, `STORY`, `ACTING`), and `category` is a plain
  `String` column with app-level validation (`isRatingCategoryKey`) — same
  convention as `User.role`, not the `Genre`/`FightSceneTag` pattern.
  Considered a `RatingCategory` table editable from `/admin` — rejected as
  more machinery (CRUD UI, handling a category being renamed/deleted out
  from under existing rating rows) than a 3-item list that isn't expected to
  grow member-by-member needs.
- **Movies only, not fight scenes**: despite the established
  mirror-the-shape-for-new-content-types convention (see Fight Scenes' own
  entry above), category ratings were scoped to movies only per explicit
  direction — `FightSceneRating`/`FightSceneAdminRating` are unchanged.
- **Editors' Score gets category breakdowns too**, per explicit direction —
  `SubcategoryAdminRating` mirrors `SubcategoryRating` the same way
  `AdminRating` mirrors `Rating`. No per-category note field, though:
  `AdminRating.note` already covers freeform editor commentary, and
  duplicating a note box per category wasn't asked for and would have
  bulked up the widget for little gain.
- **One upsert per category, not a combined batch endpoint**: two new routes
  (`POST /api/movies/[id]/rating/category`, `POST
  /api/movies/[id]/admin-rating/category`) each take a single `{category,
  score}` and upsert one row — mirroring the existing overall-score route's
  immediate-save-on-click UX (`RatingWidget`/`AdminRatingWidget` already
  save the instant a number button is clicked, no separate "Submit"). A
  combined endpoint taking all categories at once was considered and
  dropped — it would've forced a save-all-at-once UX inconsistent with how
  the overall score already behaves on the same page.

### Movie/actor SEO metadata and actor-page TMDB bios
**PR #53.** `/movies/[id]` and `/actors/[personId]` previously had no
per-page `<title>`/description/Open Graph tags — every page fell back to
the site-wide default, and shared links didn't unfurl with a poster or
synopsis. Actor pages also showed filmography and fight-scene appearances
from our own catalog but no biography/birthday/place-of-birth, even though
that data is one TMDB `/person/{id}` call away via the existing
`person.tmdbId`.

- Both pages' `generateMetadata` share the same Prisma lookup as the page
  body via React's `cache()`, rather than querying twice per request (the
  simpler pattern already used by
  `movies/[id]/fight-scenes/[fightSceneId]/page.tsx`, which re-fetches) —
  worth the extra `cache()` wrapper here since these are heavier
  multi-relation queries than a single fight-scene lookup.
- `generateMetadata` on the movie page re-runs the exact same
  pending-movie visibility check (`status === "APPROVED"` or
  submitter/admin/reviewer) as the page body, not just a `notFound()` in
  the body — metadata output is as much a side door onto a pending movie's
  title/synopsis as any other public surface, and PR #15/#16 was explicit
  that a partial gate defeats the point.
- `layout.tsx` already had a `metadataBase` (derived from `NEXTAUTH_URL`);
  reused it directly rather than introducing a second derivation off
  `VERCEL_PROJECT_PRODUCTION_URL` from an earlier, since-abandoned attempt
  at this same feature — one metadataBase source, not two disagreeing ones.
- Actor bios are live-fetched from TMDB on every page view and never cached
  in our own database, same tradeoff already made for movie posters/details
  elsewhere — gracefully omitted (not an error page) if TMDB is unreachable
  or has nothing on record for that person.
- `noindex` added to thin/duplicate-content and account-only pages that
  don't benefit from ranking: both search pages (`follow: true`, so
  crawlers still reach movie/actor pages linked from results), and
  login/register/forgot-password/reset-password/verify-email/my-lists
  (`follow: false`). The whole `/admin` subtree got one `noindex` on its
  shared layout rather than one per admin page.

### Admin Recommendations: per-admin badges, not a single shared flag
**PR #TBD.** Two admins each need their own "I recommend this" mark on a
movie, distinct from the existing single shared Editorial Review.

- Modeled as `MovieRecommendation` with a `@@unique([adminId, movieId])`
  constraint — same shape as `AdminRating`, not `EditorialReview` — so each
  admin's recommendation is independent. A movie can carry zero, one, or
  both admins' picks at once; recommending doesn't overwrite the other
  admin's mark.
- The badge is a colored circle with the admin's initial, deterministically
  colored from their user id, as the default — the fallback for any admin
  without a real icon yet. `son323`'s real icon shipped in the same PR:
  `ADMIN_BADGE_ICONS` (`src/lib/admin-badge-icons.ts`) maps a username to an
  image under `public/badges/`, and `RecommendedBadges` renders that `<img>`
  instead of the circle when a match exists — no schema or call-site changes
  needed, exactly the swap this was designed for.
- The icon (`public/badges/wang-seal.png`) is a cropped photo of a red
  Chinese name-seal ("chop") stamp, supplied and explicitly approved by the
  admin after being told it originated from a commercial marketplace product
  listing (with the seller's watermark cropped out of this specific crop,
  but the underlying photography still theirs). An original SVG recreation
  in the same style was built and offered as a no-licensing-question
  alternative; the admin chose the real photo instead, so this is worth
  revisiting if that becomes a concern later.
- The toggle and badges live next to the movie title on the detail page
  (not tucked next to Editorial Review further down the page) since the
  point is at-a-glance visibility, and the same badge is reused as a small
  overlay on `MovieCard` so it shows up automatically everywhere that
  shared component is used — currently wired into `/search`'s browse grid
  and the homepage's `MovieRail` sections.

### Cross-member list browsing at `/lists`, separate from the leaderboard
**PR #38.** Lists have been public since day one specifically to leave room
for this (see the schema comment on `MemberList`), but the only way to find
another member's list was a direct permalink or the capped top-20
Most-Liked-Lists ranking on `/leaderboard`.

- Built `/lists` as its own paginated browse page (12/page, newest-updated
  or most-liked sort) rather than folding browsing into `/leaderboard` —
  the leaderboard is a ranking (top 20, likes-only), while browsing needs
  every list, including ones with zero likes or an unranked position.
  Reusing one page for both would mean either capping the leaderboard's
  browse value or losing its "top 20" framing.
- The nav's "Lists" link (previously pointing straight at `/leaderboard`,
  the only lists surface that existed) now points at `/lists` instead,
  since general browsing is the more literal reading of "Lists" in a nav.
  `/leaderboard` stays reachable via a cross-link on `/lists`, and `/lists`
  is linked back from `/leaderboard` the same way, so neither page is an
  orphan.
- Only lists with at least one item (movie or fight scene) are listed —
  matches `/leaderboard`'s existing `entries: { some: {} }` filter,
  extended to also count fight-scene-only lists so a scene-only list isn't
  invisible to browsing the way it already wasn't invisible to the
  leaderboard's movie-count-based Top Curators ranking.

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

**Homepage strip shrunk further to title + byline only (5th iteration, PR
#43):** a follow-up pass first tried a 2-column card grid with a red
eyebrow label per post (echoing the hero carousel's "Trending this week"
treatment), then reverted that on explicit direction back to the original
single-column layout, then shrunk again past even that — the homepage
strip now drops post-body text entirely (`news-strip.tsx` no longer reads
`post.content` at all), showing just a title and byline per row inside a
single divider-separated list rather than individual bordered cards. The
"View all →" link was already the intended way to read further, so the
excerpt was doing very little work beyond taking up vertical space; cutting
it makes the section closer to a true at-a-glance ticker. The `/news`
archive is unaffected — it still shows full text, clamped to 4 lines with
a "Show more" toggle.

**Reverted to the original single-post teaser banner (6th iteration, PR
#43):** rather than shrinking the multi-post strip further, went back to
the very first homepage treatment from before the 2nd iteration above —
`NewsTeaser`, a single-line banner showing only the *latest* post (red
"Latest Update" label, title, "Read more →"), the whole banner linking to
`/news`. `getRecentNewsPosts`/`NEWS_HOMEPAGE_COUNT` and `news-strip.tsx`
are removed as unused now that the homepage only ever needs the single
newest post; `getLatestNewsPost()` replaces them (mirrors the original
`9900ab7` implementation, minus its now-unneeded `author` include since
the teaser doesn't show a byline). Every prior text-treatment reasoning
above (300-char excerpt, then title+byline-only) no longer applies to the
homepage at all — there's exactly one post shown, with no post-body text.
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

### Member profile split into tabs, own-profile view only
First step on the "Expand member profile" backlog item — the site owner
flagged that the page's organization "doesn't scale well." It didn't:
Favorites, Watchlist, Pending Submissions, and Favorite Fight Scenes each
rendered their *entire* collection into an unpaginated flex-wrap grid,
stacked one after another, then every one of a member's custom lists
rendered *its* entire contents too, stacked below that — a member with a
modest amount of activity turned this into one very long scroll with no
way to jump to a specific section.

- **Tabs (`ProfileTabs`, a small client component holding just the active
  tab's key), not pagination or a redesigned dashboard** — the underlying
  data was already fetched together server-side in one page load; tabs
  just change how it's *presented*, which is the actual problem being
  solved right now. Pagination/infinite-scroll within a tab and a curated
  "Overview" summary tab are both reasonable follow-ups, deliberately left
  out of this pass to keep it scoped to the reorganization itself.
- **Only the owner's own view gets tabs.** Viewing someone else's profile
  only ever showed their public custom lists — a single section — so a
  tab bar around one tab would be pure UI noise. That view is untouched.
- **Each tab label carries a live count** (e.g. "Favorites (2)") pulled
  from the same data already being fetched — gives an at-a-glance sense of
  how much is in each section without opening it, which the old stacked
  layout couldn't offer since everything was already visible at once.
- **`MovieRow`/`FightSceneRow`'s `title` prop made optional** rather than
  adding a second variant of each — the tab label already names the
  section, so the row's own heading is only rendered when a title is
  passed (i.e., never from the tabbed owner view, still shown in the
  untouched non-owner list rendering).
- **Verified in a real browser, not just lint/build**: seeded a member
  account with favorites, a watchlist entry, and an existing list,
  confirmed each tab switches correctly with accurate counts, and
  confirmed the non-owner view still renders the plain (non-tabbed) public
  lists section unchanged.

Stats, a bio field, and contributor badges — the other pieces discussed
for this backlog item — are intentionally not part of this change; see the
"Expand member profile" backlog entry below for what's still open.

### Member profile bio field
**Schema-touching.** Second step on "Expand member profile" — adds
`User.bio` (nullable `String`, no DB-level length constraint) plus an
inline editor on the owner's own profile page.

- **280-character cap, enforced app-side only** (`BIO_MAX_LENGTH` in
  `src/lib/profile.ts`), the same pattern already used for list names
  (`MEMBER_LIST_NAME_MAX_LENGTH`) and usernames — no CHECK constraint in
  the migration. Chose 280 specifically (the familiar Twitter-bio length)
  over a longer free-text field: a profile bio is meant to be a short
  self-description, not another content field, and a hard cap keeps the
  profile page's layout predictable.
- **Public, same visibility as username** — shown to any visitor on the
  owner's profile, not just the owner. Consistent with the rest of the
  profile page: usernames, public lists, and now bios are all visible to
  everyone; only Favorites/Watchlist/Pending Submissions stay
  owner-only.
- **Empty string clears back to `null`, not stored as `""`** — the
  profile page's placeholder logic ("No bio yet." / "Add a bio") checks
  for a falsy value, so an explicitly-cleared bio and a never-set one look
  identical rather than rendering an empty paragraph.
- **New `PATCH /api/profile/bio` endpoint, not folded into an existing
  route** — mirrors `PATCH /api/lists/[listId]`'s shape (auth check,
  trim, length validation, single `prisma.user.update`) but needs no
  ownership lookup first, since it always targets `session.user.id`
  rather than a resource ID from the URL.
- **Verified in a real browser, not just lint/build**: applied the new
  migration against a local Postgres dev DB, added a bio as the `member`
  seed account, confirmed it persists across a page reload, and confirmed
  it's visible on a signed-out/other-member view of that profile while a
  bio-less profile (`admin`) shows nothing rather than an empty section.

### Member profile: Activity and Liked Lists tabs
Third piece of "Expand member profile" — two more tabs, chosen because
both were mostly reuse of existing data/logic rather than new features.

- **Activity tab reuses the homepage's `getRecentActivity()`/`ActivityFeed`
  almost as-is** — added an optional `userId` param to scope the same
  fight-scenes/lists/discussions query to one member, and an optional
  `title` prop to `ActivityFeed` (`null` skips the heading and the
  homepage's "hide the whole section when empty" behavior, showing
  "Nothing here yet." instead — matching every other tab's empty state).
  Shown on **both** the owner's and a visitor's view of a profile,
  because this exact data (which fight scenes/lists/discussions belong to
  which member) is already fully public on the homepage for every member —
  scoping it to one profile adds no new exposure.
- **Liked Lists is owner-only**, unlike Activity — checked first whether
  likes are shown publicly anywhere else in the app (list permalink
  pages) and found only an aggregate count is ever shown, never who
  liked a list. Individual like attribution isn't public information
  anywhere today, so a tab exposing "lists this member has liked" would
  be a new privacy surface, not a reuse of an existing public fact —
  kept private to match Favorites/Watchlist's existing precedent instead.
- **Non-owner profiles gained a tab bar for the first time** (Lists,
  Activity) — previously skipped there since Lists was the only section
  and a one-tab bar would be noise. With two sections now, tabs are
  worth it; Lists stays the default/first tab to match prior behavior
  exactly (no change in what a visitor sees first).
- **Owner's tab count is now 8** (Profile, Activity, Favorites,
  Watchlist, Pending, Fight Scenes, Lists, Liked Lists) — `ProfileTabs`
  already scrolls horizontally on overflow, so this doesn't break, but
  it's worth flagging: if more tabs get added later, grouping some under
  a secondary nav (e.g. folding Pending into Profile, or a "More" menu)
  is worth considering rather than growing the flat tab bar indefinitely.
- **Added composite indexes for the new per-user query pattern**, caught
  during review, not written proactively: `getRecentActivity()`'s
  `userId`-scoped mode is the *first* thing in the codebase to query
  `FightScene`/`DiscussionPost` by submitter/author rather than by movie —
  neither `FightScene.submittedById` nor `DiscussionPost.userId` had an
  index (only `movieId` did on both), so those queries would fall back to
  a full scan as either table grows, with nothing to catch it in
  development at today's small data volume. Added
  `@@index([submittedById, createdAt])` and `@@index([userId, createdAt])`
  respectively — a composite on the exact (filter, sort) pair the query
  uses, not just the filter column, so Postgres can satisfy both the
  `WHERE` and the `ORDER BY` from the index directly.
- **Verified in a real browser**: seeded a like from `member` onto
  another account's list, confirmed the Liked Lists tab shows it with
  correct attribution and timestamp; confirmed the Activity tab shows
  only `member`'s own fight scenes/lists/discussions, not the whole
  community's; confirmed a visitor's view of a different (activity-less)
  profile shows "Nothing here yet." rather than an empty tab; confirmed
  the homepage's own Community Activity section is visually unchanged.

### Lists and Liked Lists merged into one tab with an inner toggle
Immediate follow-up to the entry above, which had already flagged the
owner's flat tab count (8) as worth watching. The site owner agreed and
asked specifically for Lists + Liked Lists to merge — not the broader
"combine every list-shaped tab" option (Favorites/Watchlist stayed
separate, since those are built-in collections, not `MemberList` rows).

- **New `ListsPanel` component, not a nested `ProfileTabs`** — reusing
  `ProfileTabs` recursively would visually stack two identical
  full-width underlined tab bars, reading as two peer levels of
  navigation rather than one level nested inside the other. `ListsPanel`
  is deliberately a lighter pill/segmented-control toggle instead, so
  "My Lists" vs. "Liked" reads as sub-navigation within the Lists tab,
  not another row of top-level tabs.
- Owner's top-level tab count drops from 8 to 7 (Profile, Activity,
  Favorites, Watchlist, Pending, Fight Scenes, Lists). Non-owner
  profiles are unaffected — they never had a Liked Lists tab to begin
  with (owner-only, per the entry above), so their Lists tab is
  unchanged.
- **Verified in a real browser**: confirmed the Lists tab defaults to
  "My Lists," confirmed switching to "Liked" shows the previously-seeded
  liked list with correct attribution, and confirmed both sub-toggle
  states keep their own counts in sync with the pill labels.

### Member profile stats strip
Last piece of the original "Expand member profile" wishlist besides
contributor badges and favorite genres. Built via the `dataviz` skill's
stat-tile contract (sentence-case label, semibold value, optional muted
secondary line — no delta/sparkline, since these are cumulative counts,
not a time series). Public on both owner and visitor views, placed above
the tabs alongside the bio.

- **First draft included a "Lists created" tile — caught in review as a
  literal duplicate of the already-visible "Lists (N)" tab count**,
  dropped. The other original two (movies/fight scenes submitted) aren't
  duplicated anywhere: "Pending" only counts movies still awaiting
  approval, not the submitted total, and the "Fight Scenes" tab is
  favorited scenes, not submitted ones — worth checking each candidate
  stat against the tabs individually rather than assuming the whole
  category is redundant just because one tile was.
- **Three more tiles added on request**: movies rated, fight scenes
  rated, and discussion posts (posts and replies combined, unlike the
  Activity tab which only ever shows the 5 most recent top-level posts,
  not a total). None of these individually expose anything new — ratings
  already aggregate anonymously into a movie's community score (no
  individual score is shown here, just a count of how many exist), and
  discussion posts are already public with attribution — so a count is a
  smaller step than the submission counts, not a new category of
  disclosure.
- **Verified in a real browser**: confirmed all six tiles render with
  real counts pulled from the seed/test data, confirmed the redundant
  Lists tile is gone, confirmed lint/build stay clean with the final
  seven-field component signature.

### Member-facing password change added to the Profile tab
**Schema-touching.** Members previously had no way to change their own
password short of the forgot-password email flow (or, for admin/reviewer
accounts, `AdminAccountSettings`). Added a self-service version to the
owner's Profile tab, reusing the admin one's server-side logic and UI
pattern almost verbatim rather than designing a new flow.

- **New `PATCH /api/profile/password` endpoint mirrors `PATCH
  /api/admin/account/password`'s logic exactly** (bcrypt-compare the
  current password when one exists, `validateNewPassword`, hash, write
  `passwordChangedAt`) but swaps `requireReviewerSession()` for a plain
  `auth()` check — any signed-in member, not just admin/reviewer.
- **`hasPassword` (derived from `!!user.passwordHash`) drives whether
  "current password" is required**, both client-side (`MemberPasswordEditor`
  hides/skips the field) and server-side (the route itself only compares
  against a hash when one exists) — same reasoning as the admin version:
  a Google-only account has no password yet, so this doubles as "set a
  password" for those members instead of "change password".
- **Signs the member out on success**, same as the admin flow — a
  password change writes `passwordChangedAt`, which invalidates every
  session's JWT on next check (see "Poster upload MIME sniffing, and JWT
  sessions invalidated on password change"), including the one making the
  request, so signing out immediately avoids a confusing stale-session
  state instead of waiting for the next request to bounce them.
- **Verified in a real browser**: wrong current password shows an inline
  error and doesn't sign out; correct current password updates the hash,
  signs the member out, and the new password successfully logs back in.

### Member profile: location and website/social link fields
**Schema-touching.** Two more optional profile fields alongside bio,
added together in the same PR as the password-change feature above since
both touch the Profile tab's editor. Adds `User.location` (nullable
`String`, capped at 100 chars app-side, same pattern as bio) and
`User.websiteUrl` (nullable `String`, capped at 200 chars, validated as an
absolute `http(s)` URL server-side via `isValidProfileUrl`).

- **Folded into the existing bio editor rather than three separate
  mini-editors** — `MemberBioEditor` became `MemberProfileDetailsEditor`,
  editing and saving all three fields (bio, location, website) together
  through one new `PATCH /api/profile/details` endpoint, replacing the
  old `PATCH /api/profile/bio` route rather than keeping both. A member
  editing their profile is already looking at one section, not three
  independent widgets, and the fields share the same visibility/validation
  shape (optional, capped length, clears to `null` on empty).
  Same public/owner-only visibility as bio: shown under the username on a
  visitor's view, editable inline on the owner's own Profile tab.
- **Single link field, not a typed multi-link list** — chose one generic
  `websiteUrl` (labeled "Website or social link") over per-platform fields
  (Letterboxd, YouTube, etc.) or a link array, since a typed/repeatable
  link model is a bigger schema shape for a feature nobody's asked to use
  more than one link yet; easy to revisit if that changes.
- **Verified in a real browser**: set bio/location/website as the seed
  `member` account, confirmed all three persist and render on reload, and
  confirmed the website renders as a clickable link with
  `rel="noopener noreferrer nofollow"`.

### Profile tab fields made directly editable, no click-to-expand
Both `MemberProfileDetailsEditor` and `MemberPasswordEditor` originally
opened in a read-only/collapsed state with an "Edit" or "Change password"
button gating the actual form — mirroring the admin settings page's
pattern. Caught on review as an unnecessary extra step on a tab a member
is already visiting specifically to edit their profile: removed the
gate on both, so every field renders as its final editable input
immediately.

- `MemberProfileDetailsEditor` dropped its `editing` boolean entirely —
  the bio textarea and location/website inputs are always live, with
  Save disabled until a value actually differs from what's saved (avoids
  a no-op request on an unmodified page).
- `MemberPasswordEditor` dropped its `editing` boolean the same way — the
  password fields render immediately rather than behind a "Change
  password" click; the submit button's label (`Change password` / `Set a
  password`) still carries the same `hasPassword`-driven distinction.
- No API change — this was UI-only, verified by re-running the existing
  browser checks for both flows (dirty-tracking on the Save button,
  wrong/right current password) against the new always-open layout.

### Social platform icons for the website/social link field
Follow-up to the single-`websiteUrl`-field decision above, from explicit
feedback: rather than adding dedicated per-platform columns (rejected —
same reasoning as before, a schema-shape jump for a field nobody's
asked to fill with more than one link) or a generic multi-link table
(more flexible but the biggest lift), kept the one field and instead
**detect the platform from the URL's hostname and render a matching
icon + label** in place of raw URL text.

- `detectSocialPlatform()` (`src/lib/profile.ts`) matches a small fixed
  hostname table (`x.com`/`twitter.com`, `instagram.com`, `youtube.com`/
  `youtu.be`, `tiktok.com`, `facebook.com`/`fb.com`, `reddit.com`,
  `letterboxd.com`) and falls back to a generic "Website" id for
  anything else — including a URL that fails to parse — so a link
  always renders as something rather than erroring.
- Icons are simplified monochrome line-art (`src/components/social-icon.tsx`),
  matching the existing `ShareButton`/`FavoriteButton` icon style
  (`stroke="currentColor"`, no fill, feather-icon proportions) rather
  than full-color brand logos — keeps the icon set visually consistent
  with the rest of the site's dark theme instead of introducing
  platform brand colors.
- The same detection renders in two places: the live preview next to
  the input on the owner's own Profile tab (immediate feedback that a
  link was recognized), and the actual clickable icon+label on a
  visitor's view of the profile.
- **Verified in a real browser**: confirmed all seven recognized
  hostnames render their correct icon/label on both the owner's live
  preview and the visitor-facing link, and confirmed an unrecognized
  domain falls back to the generic "Website" icon rather than breaking.

### Trending carousel clip autoplay bounded to one lap, paused when the tab is hidden
**PR #88.** Reported bug: real visitors were sometimes seeing YouTube's
"Sign in to confirm you're not a bot" interstitial render inside a hero
carousel clip instead of the preview playing.

- **Root cause, by elimination rather than a YouTube-side error message
  pointing at it directly**: the carousel (`src/components/hero-carousel.tsx`)
  mounted a brand-new autoplaying, muted `youtube-nocookie.com/embed` iframe
  on every rotation (every 15s), indefinitely, for as long as the tab stayed
  open — an idle tab left open for hours generated an unbounded stream of
  unattended autoplay embed requests. That's the same repeated-automated-
  playback shape YouTube's anti-bot heuristics are described as targeting,
  and it was the only thing about this feature that looked bot-like — a
  single manually-loaded autoplay embed doesn't trigger this on its own.
- **Fix: cap it to one lap, not remove autoplay** — `autoRotations` counts
  timer-driven advances only (not manual arrow/dot clicks, since a human
  actually clicking through is itself evidence this isn't unattended
  playback) and clips stop autoplaying once every movie's has played once,
  reverting to the static backdrop for the rest of the session. Keeps the
  "highlight reel on load" effect the feature was built for while bounding
  total embed requests per page visit to a fixed, small number instead of
  unbounded.
- **Also pause on `visibilitychange`**: neither the rotation timer nor clip
  playback runs while `document.hidden` is true, so a backgrounded tab
  doesn't keep autoplaying (or counting against the one-lap cap) with nobody
  watching.
- Considered removing autoplay entirely (wait for a user gesture before ever
  loading the first clip) — rejected as a bigger UX regression than the bug
  warranted, since the reported failures were intermittent, not universal,
  and the "Trending this week" hero specifically wants to show its clip
  without requiring an interaction first.

### Trending carousel autoplay cap raised from 1 lap to 5
**PR #TBD.** Follow-up to the one-lap cap above, after a report that clips
stopped playing (reverting to static backdrops) after the first cycle
through the carousel — the one-lap cap working exactly as designed, not a
regression, but tighter than wanted.

- **No measured "safe" number exists to raise it to** — asked directly
  whether there's a maximum lap count that stays under YouTube's bot-check
  threshold, and there isn't one to find: YouTube doesn't publish that
  threshold, it isn't a flat per-app counter (visitor IP reputation,
  request timing, and per-session browser signals all plausibly factor in,
  none of which this app controls or can observe), and the original fix's
  root-cause attribution was already an inference by elimination, not a
  confirmed mechanism — extending it into a precise number would be
  fabricating false confidence. **5** is a judgment call (explicit
  instruction, "set it to 5"), not a validated bound.
- Implemented as `MAX_AUTOPLAY_LAPS` (`src/components/hero-carousel.tsx`)
  multiplying `movies.length` in the `autoRotations` comparison, rather
  than hardcoding the multiplier inline — makes the traded-off value a
  named, single place to revisit if it needs adjusting again.
- Everything else about the original fix is unchanged: manual navigation
  still doesn't count against the cap, and playback still pauses entirely
  while the tab is hidden.

### Actor Fun Facts and Tributes added, mirroring the movie versions exactly
**PR #TBD.** Wanted a way for members to pay homage to an actor directly
(trivia about them, a career/performance writeup), not just rate or discuss
the movies they're in — the site had two existing member-content shapes
(`FunFact`/`FunFactVote`, `MemberReview`/`MemberReviewVote`) already built
for movies, so this reuses both shapes verbatim rather than inventing new
ones.

- **New models, not a `movieId`-nullable variant of the existing ones.**
  `PersonFunFact`/`PersonFunFactVote` and `PersonTribute`/`PersonTributeVote`
  are separate tables (`personId` instead of `movieId`) rather than making
  `FunFact.movieId`/`MemberReview.movieId` nullable and adding an optional
  `personId` alongside — a shared table would need every query to filter on
  "which foreign key is set," and would tangle two conceptually distinct
  feeds (per-movie vs. per-actor) into one table for no real benefit.
- **`PersonTribute` kept the one-per-(person,author) unique constraint**,
  same as `MemberReview`, even though the feature brief describes tributes
  as being about "an actor's career **or** a specific performance" — which
  could argue for allowing several tributes per member per actor (one per
  performance). Went with the stricter mirror because there's no
  `movieId`/performance field on the model to disambiguate multiple tributes
  by the same member for the same actor, and adding one would be scope
  beyond what was asked; a member wanting to cover several performances
  writes about that in one longer tribute instead. Revisit if that turns out
  to be a real limitation in practice.
- **Fun Facts soft-delete, Tributes hard-delete** — same split as their
  movie counterparts, made for the same reason: `PersonFunFactVote` rows
  would otherwise lose their target on delete, while `PersonTributeVote`
  rows cascade away with the tribute regardless, so there's no vote history
  to preserve either way.
- **No mention auto-linking on actor Fun Facts**, unlike movie Fun Facts
  (which link mentions of the movie's own cast/franchise siblings). There's
  no equivalent small, bounded pool to match against for a single actor —
  linking against the whole site's cast/movie tables would reintroduce the
  false-positive risk `funFactMentionables` was specifically built to avoid.
  Not requested in the feature brief either, so left out rather than
  guessing at a shape for it.
- **Tributes get the same capped-rail-then-paginated-page pattern as member
  reviews** (`ActorTributesSection` capped to
  `PERSON_TRIBUTES_PREVIEW_COUNT = 2`, full list at
  `/actors/[personId]/tributes`) — called out explicitly in the brief given
  actors can accumulate tributes from many members the same way movies
  accumulate reviews.
- **New rate limiters** (`personFunFactSubmitLimiter`,
  `personTributeSubmitLimiter`, 10 per 10 minutes) mirror
  `funFactSubmitLimiter`/`memberReviewSubmitLimiter` rather than sharing
  them — keeps a burst of actor-page activity from eating into a member's
  movie-page submission budget and vice versa.

### Actor Favorite added, mirroring FightSceneFavorite
**PR #TBD.** Follow-up to Actor Fun Facts and Tributes above, adding a lighter-weight
one-tap Favorite to the actor page. (An admin-only "Editor's Spotlight" blurb was
originally scoped into this same PR but cut before merge — see Deferred & Backlog.)

- **`PersonFavorite` copies `FightSceneFavorite` exactly** (`userId`/`personId` unique
  pair, no rating scale) rather than reusing `FightSceneFavorite` with a nullable
  `personId` — same reasoning as the earlier decision to give Person Fun Facts/Tributes
  their own tables instead of nullable-`movieId` variants: a shared table would need every
  query to filter on which foreign key is set, for two conceptually distinct favorite
  feeds. Requires a verified email, matching `FightSceneFavorite`'s bar, even though a
  favorite is lighter-weight than posting content — consistency with the existing pattern
  won out over relaxing the bar for this one case.
- **The favorite route now also returns the updated count** (`{ active, count }`), unlike
  `POST .../fight-scenes/[fightSceneId]/favorite` which only returns `{ active }`. Fight
  scene cards never display a live favorite count next to the button, so they never needed
  one; the actor page does (next to the heart toggle), so the response carries it rather
  than requiring a second round-trip.
- **Cutting Editor's Spotlight after this PR's migration had already deployed once
  repeated the exact mistake "Reverted a migration rename" (above) already warned
  about.** The first commit's migration (`..._add_person_favorites_and_spotlights`)
  had already run against the shared preview database via Vercel's `prisma migrate
  deploy` build step; renaming its folder and rewriting its contents to drop
  `PersonSpotlight` (to match the trimmed schema) made Vercel's next deploy fail —
  `migrate deploy` saw a "new," never-applied migration by that new name and tried to
  recreate `PersonFavorite`, which already existed. Fixed the same way PR #18 did:
  reverted the rename/edit so the applied migration's name and contents exactly match
  what already ran, and added a separate follow-up migration
  (`..._drop_person_spotlight`) to actually remove the table. Migration history only
  grows forward from what's live; it doesn't get rewritten to look like the feature
  was never there.
- **`getMostBelovedActors()` added directly to `lib/leaderboard.ts`**, alongside
  `getMostLikedLists`/`getTopCurators`, rather than into `lib/person-favorites.ts` —
  matches how `getMostLikedLists` queries `MemberList` directly rather than living in a
  separate list-likes module; the leaderboard module is the natural home for "how is this
  ranking computed," not the per-feature lib.

### Signature Vote: one combined leaderboard across movies and fight scenes, not two
**PR #TBD.** Lets members crowd-vote on the single movie or fight scene that best
represents an actor — "what should this actor be remembered for" — surfaced as a
spotlight banner near the top of the actor page.

- **`PersonSignatureVote` is one table with nullable `movieId`/`fightSceneId`, not two
  separate vote tables (one per category).** This is the opposite shape from Person Fun
  Facts/Tributes vs. their movie-page equivalents (kept as separate tables specifically
  because those are two conceptually distinct feeds that never need comparing against each
  other). Here the whole point is the reverse: the banner shows a single leader across
  *both* categories combined, so every vote has to live in one place for a plain
  `groupBy`/max to find it. `@@unique([userId, personId])` (not `..., category]`) is what
  makes this one vote per member per actor rather than one per member per actor per
  category — picking a fight scene silently replaces an existing movie pick, matching the
  "single answer" framing rather than letting a member hold both a favorite role and a
  favorite fight scene at once. Exactly one of the two columns being set is enforced only
  in the vote route (`POST /api/actors/[personId]/signature-vote`), not a DB constraint —
  this schema has no CHECK-constraint support (see the trigram-index comment on `Movie`
  for the other functional-index gap already worked around the same way).
- **No separate "cast your vote" list.** The vote toggle (a small 🏆-plus-count button) sits
  directly on the existing Filmography poster / Fight Scene card for each credit, rather
  than a second list duplicating every movie and fight scene already on the page —
  considered and rejected specifically because some actors have hundreds of film credits,
  and a second full-length list for voting wouldn't scale any better than a third copy of
  the filmography would. Net new page real estate is just the one banner row; voting
  piggybacks on grids that already handle "a lot of items."
- **Banner hidden below 5 combined votes for that actor**, computed client-side in
  `SignatureVoteProvider`/`SignatureSpotlight` (`src/components/actor-signature-vote.tsx`)
  rather than server-side — avoids crowning a "Signature" answer, which reads as a
  confident, singular statement, off a couple of early clicks that could flip on the very
  next vote. No "too close to call" state beyond that; the vote-share percentage shown
  next to the count is enough for a viewer to judge how contested it is without more
  machinery.
- **Deliberately doesn't reuse or fold into `getMostBelovedActors`/movie ratings.** A
  highest-rated movie or most-favorited fight scene answers "how good is this," not
  "which of this actor's own roles is why you know them" — a movie can be an actor's
  best-reviewed credit for reasons that have nothing to do with their own performance in
  it (a strong ensemble, a well-regarded director). In practice the fight-scene side will
  often echo the existing favorite-count sort on that same section (fight scenes already
  sort by favorite count), so the vote's real value is mostly on the movie side, where no
  ranking existed before, and in making the actor-specific association explicit.

### Actor Filmography split into Known For + a dense list, not a bigger poster grid
**PR #TBD.** Follow-up to Signature Vote above, prompted by testing it against actors with
long filmographies — common in this genre (Sammo Hung/Jackie Chan–style careers routinely
run past 100 credits), where the original flat `flex-wrap` poster grid (unchanged since the
actor page shipped) becomes a wall of cards before a member can find anything to vote for.
**Supersedes the "No separate cast your vote list" bullet above**: the vote toggle does now
sit on what amounts to a list, but that list exists to fix Filmography browsing generally —
Known For and the dense list both serve every visitor, not just voters — rather than being a
second, voting-only list duplicating the grid, which is what that earlier bullet ruled out.

- **`MovieRailTrack` extracted from `MovieRail`** (`src/components/movie-rail.tsx`) — the
  scroll-arrows/edge-fade/card-track logic on its own, without the `mx-auto max-w-6xl px-4
  py-8` section-and-title chrome `MovieRail` wraps it in for its existing page-level callers
  (homepage, movie page). The actor page's Known For section needed the same scrollable-rail
  behavior nested inside its *own* already-padded container — reusing `MovieRail` outright
  would have doubled that padding — so the reusable part was factored out rather than forked;
  `MovieRail` itself is now a thin wrapper around the track. Per-card overlay content (the
  🏆 vote button) is passed in as a `Record<movieId, ReactNode>` of already-rendered elements,
  not a render-prop callback — a Server Component can't pass a function into a Client
  Component (not serializable across that boundary), but pre-built React elements are fine.
- **Known For ranks by `Movie.tmdbPopularity`**, already in the schema from TMDB import — no
  new data or curation step needed. Deliberately independent of the Signature Vote leader
  (see README): popularity and "what members vote as iconic" are different signals and are
  expected to disagree sometimes, same reasoning as the "doesn't reuse `getMostBelovedActors`"
  bullet above.
- **Filmography itself becomes a dense list (thumbnail, title, character, year, community
  rating), not a second poster grid.** A poster carries recognition value once, in Known For;
  repeating it for every one of 100+ credits doesn't add information, just height. A text
  filter above the list is the fallback for finding one specific title once "Show all" (or,
  here, "no cap at all") stops being enough.
- **Four list treatments were prototyped before picking this one**: rows-with-poster-thumbnail
  (shipped), a compact IMDb-style text table grouped by decade, tag-style chips (title+year
  only), and a vertical timeline. Chips were cut first — they dropped character/rating for
  barely more density than the table, without gaining a distinct enough look to earn a second
  variant. Timeline was cut next — visually the most distinctive, but it's still serving the
  same "browse and vote" job as the other two while costing more vertical space per entry, and
  a trophy-vote icon sitting in a career-timeline layout undercut the narrative mood the
  timeline was going for. That left rows-with-posters vs. the compact table — a genuine
  real-estate-vs-recognition tradeoff (posters aid recognition; the table fits roughly 3x more
  per screen) — decided in favor of posters for now, with the table kept as a real fallback,
  not a rejected idea (see Deferred & Backlog).
- **No user-facing toggle between list treatments**, even though two (posters, table) were
  both fully built and are one control away from being switchable. Rejected specifically
  because it would be a new interaction pattern with no precedent anywhere else in this app
  (no other page offers a density/view switcher), for a browsing view where one well-chosen
  default likely serves nearly everyone — a toggle earns its keep when the views serve
  genuinely different workflows, not just different amounts of the same information.
- **Fight Scenes stays a card grid** (a video thumbnail is the point, unlike a movie credit),
  but now opens collapsed to the first 6 with a **"Show all N fight scenes →"** toggle and its
  own title filter (`FightSceneCollapsibleGrid`) — same collapsed-list-behind-a-toggle pattern
  `ActorFunFactsSection` already established, not a new interaction to invent, just extended
  to a second section.

### Signature Vote split into two independent picks, not one combined leaderboard
**PR #TBD.** Reverses the "one table, single combined leader" decision at the top of the
Signature Vote entry above, after review on the PR's preview deployment: voting a fight scene
was silently replacing an already-cast movie vote (the two categories competed for one shared
"answer" slot), which read as the site discarding a member's pick rather than recording a
second one — confusing enough in practice that the combined framing wasn't worth keeping,
even though it matched the literal "what should this actor be remembered for" phrasing the
feature was scoped from.

- **No schema change.** `PersonSignatureVote` still has exactly one row per
  `[userId, personId]`, with nullable `movieId`/`fightSceneId` — only the *meaning* of those
  two columns changed, from mutually exclusive alternatives (exactly one set) to independent
  slots (either, both, or — by deleting the row — neither can be set). The migration that
  shipped with the original decision needed no follow-up migration, unlike the Editor's
  Spotlight cut earlier in this log, because the column shape itself was never wrong, only the
  application logic constraining it.
- **The vote route still validates exactly one of `movieId`/`fightSceneId` per request** —
  that's unchanged and still correct, since a single click always targets one specific card.
  What changed is what happens to the *other* slot on the stored row: it used to be cleared
  every time; now it's left untouched, so a member's fight-scene pick survives a later movie
  vote and vice versa.
- **`SignatureSpotlight` now renders up to two banners side by side** (`sm:flex-1` each,
  stacking on narrow screens), each computed by finding the leader within its own category and
  checking that category's own vote total against the 5-vote minimum — not a shared combined
  total. A "vote share" percentage on each banner is now a share of that category's votes only,
  not blended with the other category's, which is a more honest number than the combined
  version was (a movie's "72% of all signature votes" previously included fight-scene votes it
  had nothing to do with).
- **Still not two separate database tables.** The alternative considered here — going back to
  splitting `PersonSignatureVote` into `PersonSignatureRoleVote`/`PersonSignatureFightSceneVote`
  — was rejected for the same reason the single-table shape was chosen originally: no
  cross-category comparison is needed anymore, true, but the two vote kinds still share every
  other property (same actor scope, same toggle/retract mechanics, same email-verification
  gate), so two tables would just be the one-row-two-nullable-columns shape typed out twice.

### Actor Career Highlights styled like the Signature Spotlight banner, "Sparring Partner" from existing fight-scene data
**PR #TBD.** Added a career-stats box just under the actor's name/avatar.
Went through three rounds of visual treatment before landing: (1) a plain
bordered dt/dd "Details" card, matching the movie page's Studio/Country box,
compared against the member profile's stat-tile-strip (`ProfileStatsStrip`)
and a plain inline stat line — Details won that round as the closer match for
a dense summary block this close to a header; (2) Details vs. a full-width
"hero stat strip" (bigger numbers, more prominent), raised to see if the block
should read as a bigger feature — rejected because it visually outcompeted the
actor's own name for attention right under the header; (3) the actual goal
behind wanting something bigger turned out to be wanting the block to feel
like a tribute to the actor, not just louder — so it ships styled after the
existing `SignatureSpotlight` banner instead (gold `border-l-4 border-l-yellow-500`
accent stripe, a "🏆 Career Highlights" kicker pill, bold two-column stat
values), reusing a pattern this page already teaches visitors to read as an
honor rather than inventing a new one. Five stats in the grid, each
independently omitted when it has nothing to show (same "no signal, no row"
rule the Details-card version had): total approved movies, fight scenes
tagged, average community rating across the filmography, average rating
across their tagged fight scenes, and years active (earliest–latest release
year). Sparring Partner started as a sixth grid cell but was pulled back out
into its own card shortly after shipping — see the bullet below.

- **Every number comes from data already fetched for the rest of the page** —
  no new queries. Ratings are an unweighted mean of each movie's/scene's own
  average, same "no ratings-count weighting" approach used everywhere else in
  the app (see the Deferred entry below — revisiting that is a whole-app
  question, not something to special-case here).
- **The two rating stats show as `★ N.N` in yellow, not `N.N / 10`.** The
  movie page's own big hero score does say "/ 10", but every *compact*
  rating display already in the app — `MovieCard`, `FilmographyList` — drops
  it and shows just the bare starred number, since the label next to it
  already establishes what's being rated. This card is a compact context,
  so it follows that convention instead of the hero one.
- **Kept at card width, not full-bleed**, even after moving to the
  Spotlight-styled treatment — the goal was to make the block feel earned,
  not to make it bigger. A two-column grid (rather than the single dt/dd
  column the Details-card round used) lets each value stand on its own as a
  bold number instead of a label-left row, without needing the width a hero
  strip would take.
- **Sparring Partner — the co-star sharing the most distinct fight scenes with
  this actor** — came out of exploring what a co-starring/collaboration
  signal between two actors could surface (a "You Might Also Like" rail for
  actors, scored the same way as the movie version, was prototyped alongside
  this but deferred — see Deferred & Backlog). Computed entirely from
  `person.fightSceneAppearances[].fightScene.cast`, already loaded for the
  Fight Scenes section, so it's free regardless of whether that rail ships.
  Requires at least 2 shared scenes before it's shown — same
  minimum-sample-size reasoning as `TOP_RATED_MIN_RATINGS` in
  `src/lib/ratings.ts` — since most actor pairs never clear that bar; the row
  just doesn't render rather than crowning a "partner" off one coincidental
  scene together or showing a placeholder. Ties (more than one co-star at the
  same top count) go unresolved, same precedent as `getSimilarMovies`.
- **Movie-level co-starring was considered and rejected** for this stat in
  favor of shared fight scenes specifically — fight scenes are this site's
  flagship content type, and a movie-level version would resolve for nearly
  every actor with 2+ movies, which is too common to read as a distinctive
  "sparring partner," not sparse in a way that singles out a real repeat
  pairing.
- **Sparring Partner moved out of the Career Highlights grid into its own
  small card** (still in the same top row, to Career Highlights' right,
  before the bio) shortly after both shipped, following a design review
  that flagged mixing it into the stats grid as a category error: the other
  five values are quantitative (counts, an average, a year range) and
  Sparring Partner is a linked name — a relational fact, not a stat. The new
  card deliberately does **not** reuse the gold Spotlight styling — nothing
  about it was voted on or earned, it's a computed fact, so it gets the same
  plain-bordered treatment as the movie page's Details box instead. Framed
  explicitly as a small, likely-temporary home for this data: the real
  destination is probably the "expand actor-to-actor collaboration data"
  idea already in Deferred & Backlog below, once that has an actual design —
  this card exists now because the data was worth keeping visible in the
  meantime, not because this is that section.
- **Placement went through one more round after the styling landed**: tried
  living in the same flex row as the avatar/name (pinned to the right,
  desktop-only), then settled on its current spot instead — its own row
  below the avatar/name, with the bio (birthday, place of birth, biography)
  sharing that row to its right rather than sitting directly under the name
  the way it used to. Picked over the avatar-row placement because it keeps
  the very top of the page (avatar + name) uncluttered while still putting
  Career Highlights ahead of everything else below it, and it doesn't force
  the bio to compete for space with the favorite button and page padding
  the way a three-way avatar-row split would have.
- **Biography gained a 10-line clamp + "Show more"/"Show less" toggle**
  (`ActorBio`, `src/components/actor-bio.tsx`) as a direct consequence of
  the placement above — sharing its row with a 288px-wide Career Highlights
  column leaves the biography meaningfully narrower than the full-width
  paragraph it used to be, so a long TMDB biography now wraps to far more
  lines than before. Reuses the clamp-with-toggle mechanics already
  established by `ReviewText` (`RecentReviewsFeed`) and `MemberReviewCard`
  (`ReviewsSection`) — a length threshold above which a line-clamp applies,
  lifted on click — but with a taller clamp (10 lines, not those two's 3/4)
  and a proportionally scaled `CLAMP_THRESHOLD = 700`, since a biography
  reads as an article, not a review, and can reasonably earn more space
  before the toggle kicks in. `line-clamp-[10]` is an arbitrary-value class,
  not `line-clamp-10` — Tailwind's line-clamp utility only ships values 1–6
  by default, so the bare class name wouldn't generate any CSS.

## Deferred & Backlog

- **Combine Career Highlights with the page's other Signature-styled blocks**
  — raised right after Career Highlights shipped its `SignatureSpotlight`-matched
  styling: the actor page now carries up to three gold-accented "honor" blocks
  near its top (Career Highlights, plus the Signature Role and Signature Fight
  Scene spotlight banners), each currently its own separate element. Worth a
  later pass to see whether they should visually merge into one combined
  tribute section, or stay distinct — deliberately not decided now, flagged
  as a revisit rather than folded into this PR.
- **Whether per-movie ratings should be weighted by rating count** — raised
  while adding the actor page's career-stats "Community Rating" (mean of each
  movie's own community average across the actor's filmography), which
  currently weighs a movie with 2 ratings the same as one with 200, matching
  how every other per-movie stat in the app already works (no ratings-count
  weighting anywhere else either). Explicitly deferred as a broader "how should
  rating aggregation work across the app" question, not something to decide
  ad hoc for one new stat.
- **Actor-page "You Might Also Like" rail** — a similar-actors rail was
  prototyped alongside the career stats work, modeled directly on
  `getSimilarMovies`' weighted-signal approach: co-starring in the same
  `APPROVED` movie (+3 per shared movie) and sharing a fight-scene tag (+2 per
  shared tag), candidate pool via one `OR` query then scored/sorted in JS, top
  8, same "no shared signal, no rail" rule as the movie version. Built as
  `getSimilarActors` with `ActorCard`/`ActorRailTrack` components mirroring
  `MovieCard`/`MovieRailTrack` (circular avatar + name, since a `Person` has
  no poster/rating fields to render) — then pulled back out before merge, not
  ready to ship yet. The design above is the starting point for whoever
  revisits this, not a from-scratch redesign.
- **Expand actor-to-actor collaboration data beyond the single "Sparring
  Partner" stat** — that stat (top co-star by shared fight scenes, min. 2 to
  qualify) and the shelved co-starring signal above (see the previous bullet)
  both compute pairwise actor relationships already, but only surface a single
  number/name each. Worth exploring as its own feature once the similar-actors
  rail (or something like it) ships: a ranked list of an actor's top
  collaborators (blending movie co-starring and fight-scene pairings, not just
  the single top match), a dedicated pairwise view ("every scene/movie X and Y
  share"), or a site-wide "most frequent pairings" leaderboard. No schema
  change needed — same underlying `CastCredit`/`FightSceneCast` data, just
  more of it surfaced and packaged differently.
- **Toggle to a compact table view for the Filmography list** — a full IMDb-style
  decade-grouped text table (no poster thumbnails, ~3x the density of the shipped
  rows-with-posters view) was prototyped alongside it and works; not shipped as a
  user-facing switch because it'd be a new interaction pattern with no other precedent in
  this app for what's still a one-default browsing view (see "Actor Filmography split into
  Known For + a dense list" above). Revisit if long-filmography actors turn out to need the
  extra density in practice, e.g. member feedback that the posters-row view is still too
  tall for actors with 100+ credits.
- **Editor's Spotlight (admin-curated per-actor blurb/badge)** — scoped into the same
  PR as Actor Favorite (`PersonSpotlight`, mirroring `EditorialReview`'s
  one-shared-row-per-entity shape) but cut before merge at explicit request: it overlaps
  with a separate "actor highlight" feature planned elsewhere, so building it here first
  risked landing something that conflicts with or duplicates that later work. Revisit
  once the actor-highlight shape is decided — `PersonSpotlight` may still be the right
  model, or it may fold into whatever that feature turns out to be.
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
- **Two-factor authentication (TOTP)** — identified during the
  login/password hardening pass as the one remaining major lever beyond
  what's already shipped (rate limiting, CAPTCHA, breach-password
  checking, session invalidation on password change, the login timing
  fix). Deliberately not folded into any of those changes — it's a real
  feature (secret generation/storage, an enrollment flow, backup/recovery
  codes, a recovery path for a lost authenticator), not a small hardening
  patch. Revisit as its own scoped piece of work.
- **Historical timeline page** — a page visually plotting movies along a
  timeline of Chinese historical periods/dynasties each movie is *set in*
  (not its real-world release date, which `Movie.releaseDate` already
  covers). The real gap: no source has this data. TMDB doesn't track a
  film's in-story historical setting, so it'd need a new admin-curated
  attribute — likely a fixed period/dynasty taxonomy (mirroring the
  `Genre`/`FightSceneTag` pattern) rather than free text, to keep the
  timeline groupable/orderable. The timeline visualization itself (not
  just the data model) is also a real, non-trivial UI build, not a
  reskin of an existing list/grid view.
- **Meme generator** — a tool letting members caption/remix an image into
  a meme, seeded from a fight scene or movie. Image-sourcing was already
  scoped: `youtubeThumbnailUrl()` (`src/lib/youtube.ts`) gives a free,
  ToS-safe still today, already proven via the fight-scene permalink
  pages' Open Graph previews, but it's the *video's* thumbnail, not a
  frame at that scene's `youtubeStartSeconds` — for a long/compilation
  video the thumbnail may not show the tagged fight at all. Explicitly
  ruled out: extracting a real frame at that timestamp server-side
  (yt-dlp/ffmpeg or similar), since downloading YouTube video content
  violates their ToS and adds a fragile dependency YouTube could break at
  any time. Three options on the table, undecided: (1) use the
  video-level thumbnail as-is, simple but sometimes inaccurate; (2) let
  the fight-scene submitter/admin attach their own still per scene,
  mirroring the existing admin poster-override pattern (manual upload to
  Vercel Blob) — more accurate, more UI, needs someone to actually
  screenshot it; (3) fall back to the movie's poster/backdrop if neither
  of the above feels reliable enough. Also undecided: the
  caption/text-overlay editor itself, and whether generated memes get
  stored/shared or are download-only.
- **Fun facts / history section per movie** — admin-curated trivia or
  historical context shown on the movie page, likely alongside (or as an
  extension of) the existing Editorial Review. Real overlap with the
  "Historical timeline page" item above worth resolving before either is
  built: if "history" here means the film's *in-story* historical
  setting (what dynasty/period it's set in), that's the same underlying
  data gap the timeline page needs; if it means real-world trivia
  (production history, behind-the-scenes facts), it's a simpler,
  unrelated content field. Scope that distinction first.
- **Expand member profile** — tabbed reorganization, a member-editable
  `bio` field, an Activity tab, a Liked Lists tab (merged into the Lists
  tab's "My Lists" / "Liked" toggle), and a stats strip have all shipped
  (see Feature Decisions above); the scaling problem is solved and the
  original wishlist is essentially done. Owner's top-level tab count is 7
  (Profile, Activity, Favorites, Watchlist, Pending, Fight Scenes, Lists).
  Still open: contributor badges (computed from the stats strip's same
  counts, no new schema needed to start) and favorite genres (lower
  priority, more design questions — derived from rating history or a
  manual preference?). Also still open, discussed but deliberately not
  built: a profile picture upload (a real cost/scaling tradeoff, unlike
  everything else here — revisit once current Vercel Blob pricing is
  checked and a size cap is settled) and a ratings history tab (a
  member's own `Rating` rows aren't individually browsable anywhere on
  their profile today, even though the stats strip now shows a count).
- **Lists expansion to drive community engagement** — explicitly flagged
  as needing more ideas, not a scoped feature yet. Starter thoughts from
  an earlier engagement discussion, none decided: collaborative lists
  (multiple members contributing to one list, not just the owner),
  reactions/comments on a list (distinct from the existing like), themed
  admin-curated collections (e.g. "Essential Bruce Lee") separate from
  member-created ones, or a "follow a member's lists" mechanic tied into
  the notifications backlog item if that gets built. Needs a real
  brainstorming pass before committing to any of these.
- **Streamlined, swipeable fight scene viewing (YouTube Shorts-style)** —
  replace or supplement the current card-grid presentation
  (`FightSceneSection`, `/search/fight-scenes`) with a full-screen,
  vertically-scrollable/swipeable viewer that autoplays the next clip —
  same interaction pattern as YouTube Shorts/Instagram Reels/TikTok. A
  real UI paradigm shift from the existing list-based layout, not a
  reskin. Explored further (design review + a throwaway preview build on
  PR #90, not merged), still deferred — not enough conviction yet to
  commit to building the real feature:
  - Three chrome-treatment concepts were mocked up (rail-and-caption,
    ticket-stub overlay, minimal-chrome-tap-to-reveal); leaning toward the
    ticket-stub overlay since it's the only one that carries the site's
    existing "Fight Ticket" visual identity into full-screen rather than
    reading as a generic short-video clone.
  - A throwaway route (`/preview/fight-scene-feed` + `fight-scene-feed-preview.tsx`
    on PR #90) confirmed the mechanics: native CSS scroll-snap +
    `IntersectionObserver` for the active card, no new dependency needed;
    `HeroCarousel`'s muted-autoplay/reduced-motion/tab-hidden pattern
    reused directly. One real gotcha hit while building it: a full-bleed
    route still renders inside the root layout's shared navbar/footer
    unless it explicitly escapes with `fixed inset-0`.
  - Still unscoped before this is buildable for real: a compact
    rating/favorite overlay (the existing 10-button `RatingRow` and full
    ticket card don't fit over video — porting `StarRatingPicker` is the
    likely fix), a cursor-paginated fight-scene API (today's card-grid and
    search page both slice an already-fetched array, which doesn't work
    for a feed that must prefetch ahead of scroll position), and real
    entry points from `FightSceneSection`/`/search/fight-scenes` (the
    preview route is direct-navigate only, not linked from anywhere).
