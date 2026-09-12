// Matches a pathname against a route pattern: a plain path ("/lists") matches
// only that exact path, while a "/*" suffix ("/lists/*") also matches
// anything nested under it. Kept as plain data (strings) rather than
// predicate functions so nav components can take these as props straight
// from a Server Component -- functions aren't serializable across that
// boundary.
function matchesPath(pathname: string, pattern: string): boolean {
  if (pattern.endsWith("/*")) {
    const base = pattern.slice(0, -2);
    return pathname === base || pathname.startsWith(`${base}/`);
  }
  return pathname === pattern;
}

export function matchesAnyPath(pathname: string, patterns: string[]): boolean {
  return patterns.some((pattern) => matchesPath(pathname, pattern));
}
