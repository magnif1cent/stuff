# Working on this repo

This is a Next.js + Prisma + Auth.js app (Kung Fu Sauce). Multiple
conversations work on this repo in parallel, each usually on its own feature
branch and PR, so a few conventions keep things from drifting apart.

## Keep README.md in sync

If your changes in this conversation add or change any of the following,
update the relevant section of `README.md` in the **same PR**, not as a
follow-up:

- A user-facing feature or capability (new page, new thing a member/admin can
  do, a changed permission rule)
- A new or changed environment variable (also update `.env.example`)
- A new setup/deploy step (a new external service to configure, a new CLI
  command to run)
- A change to the data model that affects `prisma/seed.ts` or how the app is
  set up locally

Small internal refactors, bug fixes, or styling tweaks that don't change what
the app does or how it's set up don't need a README update.

When updating README.md, verify your description against the actual code you
just wrote (or read), not just your intent for it — this keeps the docs
accurate rather than aspirational.

`README.md` is edited far more often than `DECISIONS.md` — most user-facing
changes touch it. Don't read the whole file to find where a sentence belongs;
use its `## Contents` section (or grep `^## ` / `^### `) to jump to the
relevant section first.

## Keep DECISIONS.md in sync

`README.md` documents *what* the app does; `DECISIONS.md` documents *why* it
was built that way and what's still open. Add an entry in the same PR when
your change involves:

- A real judgment call between alternatives (a UI approach tried and
  replaced, a library chosen over another, a scope boundary picked
  deliberately) — goes under **Feature Decisions**.
- An architecture/stack-level milestone (a new subsystem, a schema-shaping
  decision, a new infra dependency, a process convention) — goes under
  **Foundational Changes**.
- Explicitly deferring something you considered but aren't building now —
  goes under **Deferred & Backlog**.

Don't add an entry for a pure bug fix, a mechanical refactor, or anything
that isn't a judgment call — `git log`/the PR description already cover
those, and a decisions log that logs everything stops being useful for
finding the decisions that matter. Reference the PR number so the entry
stays traceable back to the diff.

`DECISIONS.md` is long and only getting longer — don't read the whole file
to add an entry. Use its `## Contents` section (or grep `^### ` / `^## `) to
find the right spot, then read only that entry and its neighbors before
appending.

## Code integrity across parallel conversations

- Keep Prisma schema changes, migrations, seed data, and any TypeScript types
  derived from them in sync within the same PR — don't let a schema change
  land without updating what depends on it.
- Prefer deriving component prop types from Prisma-generated types (e.g.
  `Pick<Movie, "id" | "title">`) instead of hand-duplicating shapes, so they
  can't silently drift from the schema.
- Soft-delete (an `isDeleted` boolean) is the established pattern for
  user-generated content with dependents (discussion posts, fight scenes) —
  prefer it over hard deletes so referential integrity and thread structure
  aren't broken by another conversation's assumptions.
- If your change touches the Prisma schema, flag that clearly in the PR
  description — schema-touching PRs should be merged and pulled before
  another schema-touching PR starts, to avoid migration conflicts.

## Stay in sync with master before building

Other conversations merge PRs into `master` while yours is in progress. Before
starting new feature work on a branch (and again right before opening or
merging a PR), fetch and check whether `master` has moved ahead:

```bash
git fetch origin master
git log HEAD..origin/master --oneline
```

If that shows commits, merge `master` into your branch, resolve any
conflicts, and re-run lint/build against the merged code *before* continuing
— don't build new work on top of a base another PR has already moved past.
This isn't needed before every intermediate build while iterating on one
piece of work, just at the start of a new task and before merging, since
that's when a stale base actually causes problems (structural conflicts,
duplicated features, docs describing an old layout).

Also check **open** PRs, not just what's already merged into `master` — an
in-flight PR from another conversation can overlap with what you're about to
build even before it merges, and catching that before you start is cheaper
than discovering it as a merge conflict later. A quick scan of open PRs
(titles/descriptions are usually enough) is worth doing at the start of a new
task, alongside the `master` check above.

## `master` branch protection

`master` is protected by a GitHub ruleset: pushes must go through a pull
request, force-pushes and branch deletion are blocked, and the
`build-and-lint` CI check must pass before a PR is mergeable. This is
enforced by GitHub itself now, not just convention — a direct push to
`master` will be rejected outright.

## Wait for explicit "merge" before merging a PR

Open the PR once `build-and-lint` is green, then **stop and wait** — don't
call the merge API yourself. The site owner wants to preview the Vercel
deployment and request adjustments before a PR lands on `master`. Only merge
once they've explicitly said so in the conversation (e.g. "merge",
"merge it," "go ahead and merge") — a green CI check alone is not
authorization to merge.
