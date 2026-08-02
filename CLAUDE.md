# Working on this repo

This is a Next.js + Prisma + Auth.js app (Kung Fu Movie Database). Multiple
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
