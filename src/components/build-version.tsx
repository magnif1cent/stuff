// Vercel injects these as System Environment Variables at build time (no
// setup needed beyond the project default), so this is nearly free to keep
// accurate — no manual version bump, no release process this project
// doesn't otherwise have. Renders nothing meaningful locally (no Vercel env),
// which is fine: this exists to answer "which deploy am I looking at" on a
// live site, not to be a local dev indicator.
export function BuildVersion() {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA;
  const env = process.env.VERCEL_ENV;

  const label = sha
    ? `Build ${sha.slice(0, 7)}${env && env !== "production" ? ` · ${env}` : ""}`
    : "Local dev build";

  return (
    <footer className="border-t border-neutral-800 px-4 py-3 text-center font-mono text-[11px] text-neutral-600">
      {label}
    </footer>
  );
}
