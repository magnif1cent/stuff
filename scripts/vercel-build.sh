#!/bin/sh
# Vercel's Build Command (see vercel.json's buildCommand) -- runs prisma
# migrate deploy, then the Next.js build. Retries migrate deploy a few
# times before giving up: the Preview environment's database is one
# static, shared Neon branch across every open PR (see DECISIONS.md,
# "Preview database made static across PRs"), so concurrent deployments
# can collide on Prisma's migration advisory lock. A failure here is
# usually that transient contention clearing itself within a few
# seconds, not a real migration problem -- so retry a few times before
# actually failing the deploy.
set -e

attempt=1
max_attempts=3
until npx prisma migrate deploy; do
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "prisma migrate deploy failed after $max_attempts attempts" >&2
    exit 1
  fi
  echo "prisma migrate deploy failed (attempt $attempt/$max_attempts), retrying in 5s..." >&2
  attempt=$((attempt + 1))
  sleep 5
done

npm run build
