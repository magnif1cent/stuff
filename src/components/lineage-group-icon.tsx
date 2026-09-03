// A collective (a stunt team, say), not a single trained person -- the same
// glyph wherever a group figure needs to read as a group rather than an
// individual: a picker result row, an admin tree node, or a node in the
// public tree. No "use client" pragma -- this is plain, static SVG markup,
// safe to render from a Server Component (LineageTreeBody) as well as the
// client-only admin components.
export function GroupIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <circle cx="8.5" cy="8" r="3" />
      <circle cx="16" cy="9.5" r="2.4" />
      <path d="M2.5 19c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" />
      <path d="M14.5 14.2c2.6.3 4.5 2.2 4.5 4.8" />
    </svg>
  );
}
