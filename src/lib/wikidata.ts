const WIKIDATA_SPARQL_URL = "https://query.wikidata.org/sparql";

// Wikimedia's User-Agent policy asks every automated client to identify
// itself and a contact point -- see
// https://meta.wikimedia.org/wiki/User-Agent_policy. This is a low-volume,
// import-time-only caller (see importMovieFromTmdb), not a live per-request
// dependency, so a plain descriptive string is enough.
const USER_AGENT = "KungFuSauce-actor-import/1.0 (https://github.com/magnif1cent/stuff)";

// TMDB's imdb_id is always this shape ("nm" + digits). Checked before
// interpolating it into a raw SPARQL string below.
const IMDB_ID_RE = /^nm\d+$/;

// Anything outside the Latin script block (plus common Latin extensions,
// spacing, punctuation) counts as "non-Latin" here. Unlike the same check
// run earlier against TMDB's also_known_as (a freeform, user-typed alias
// list full of random transliterations), this is applied to Wikidata's
// curated P1559 ("name in native language") claims -- every value there is
// a real name in some language, never a nickname or misspelling, so "first
// non-Latin-script claim" is a safe way to pick the one actually worth
// showing as a native name (see DECISIONS.md).
const NON_LATIN_RE = /[^ -ɏḀ-ỿ\s.'’\-]/u;

export interface WikidataNativeName {
  name: string;
  language: string;
}

interface SparqlBinding {
  nativeName: { value: string };
  nativeNameLang: { value: string };
}

// Looks up a person's native-language name on Wikidata by cross-referencing
// their IMDb id (P345) -- no name matching involved, an exact id-to-id join.
// Returns null whenever there's nothing usable: no matching Wikidata entity,
// no P1559 claim on it, or only a Latin-script value (which would just
// duplicate the display name).
export async function getWikidataNativeName(imdbId: string): Promise<WikidataNativeName | null> {
  if (!IMDB_ID_RE.test(imdbId)) return null;

  const sparql = `
    SELECT ?nativeName ?nativeNameLang WHERE {
      ?person wdt:P345 "${imdbId}".
      ?person wdt:P1559 ?nativeName.
      BIND(LANG(?nativeName) AS ?nativeNameLang)
    }
  `;
  const url = new URL(WIKIDATA_SPARQL_URL);
  url.searchParams.set("query", sparql);
  url.searchParams.set("format", "json");

  const res = await fetch(url.toString(), { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) {
    throw new Error(`Wikidata request failed (${res.status})`);
  }
  const data = (await res.json()) as { results?: { bindings?: SparqlBinding[] } };
  const bindings = data.results?.bindings ?? [];

  const nonLatin = bindings.find((b) => NON_LATIN_RE.test(b.nativeName.value));
  if (!nonLatin) return null;

  return { name: nonLatin.nativeName.value, language: nonLatin.nativeNameLang.value };
}
