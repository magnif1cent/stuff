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

## Feature Decisions

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

## Deferred & Backlog

- **Per-admin Editors' Score note visibility, now that a second admin
  exists** — checked whether `AdminRating` supports two independent
  admins rating the same movie: it already does, with no code changes
  needed. `AdminRating` is `@@unique([adminId, movieId])` (same shape as
  member `Rating`), `getEditorsRatingSummary` already averages across
  every admin's row for a movie, and `AdminRatingWidget` already scopes
  to `session.user.id` so one admin's rating never overwrites another's —
  the public Editors' Score already correctly reflects both admins once
  both have rated. What's still open: each admin's individual score and
  note are currently visible only to that admin (no public display, and
  no way for a second admin to see the first admin's note before writing
  their own) — considered showing both admins' scores+notes either
  publicly (byline'd, like Recent Reviews by Editors) or admin-only, and
  deferred both pending a decision on which. Confirmed the two options
  are cheap to switch between later if built — same data fetch and
  component either way, difference is just a role-check gate — so this
  isn't a decision the "future flexibility" cost should be weighed on.
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
