// Renders a JSON-LD <script> tag for search-engine structured data
// (schema.org rich results). `JSON.stringify` doesn't escape "<", so a
// member-submitted string containing "</script>" (a fight scene title, an
// actor bio pulled from TMDB) could otherwise break out of the script tag
// into the surrounding HTML -- the `<` escape keeps it a harmless
// string inside the JSON instead.
export function JsonLd({ data }: { data: object }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
