import { afterEach, describe, expect, it, vi } from "vitest";
import { getWikidataNativeName } from "@/lib/wikidata";

function mockSparqlResponse(bindings: { nativeName: string; lang: string }[]) {
  return {
    ok: true,
    json: async () => ({
      results: {
        bindings: bindings.map((b) => ({
          nativeName: { value: b.nativeName },
          nativeNameLang: { value: b.lang },
        })),
      },
    }),
  };
}

describe("getWikidataNativeName", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects anything that isn't a plain TMDB-shaped imdb id, without calling out", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    expect(await getWikidataNativeName("not-an-imdb-id")).toBeNull();
    expect(await getWikidataNativeName("tt0147800")).toBeNull(); // title ids ("tt..."), not person ids
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns null when there are no claims at all", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockSparqlResponse([])));
    expect(await getWikidataNativeName("nm0947447")).toBeNull();
  });

  it("returns null when every claim is Latin-script (would just duplicate the display name)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(mockSparqlResponse([{ nativeName: "Tom Hanks", lang: "en" }])),
    );
    expect(await getWikidataNativeName("nm0000158")).toBeNull();
  });

  it("picks the first non-Latin-script claim, skipping Latin ones ahead of it", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mockSparqlResponse([
          { nativeName: "Donnie Yen", lang: "en" },
          { nativeName: "甄子丹", lang: "yue" },
        ]),
      ),
    );
    expect(await getWikidataNativeName("nm0947447")).toEqual({ name: "甄子丹", language: "yue" });
  });

  it("throws on a non-ok response rather than silently returning null", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    await expect(getWikidataNativeName("nm0000045")).rejects.toThrow();
  });
});
