import { describe, expect, it } from "vitest";
import { getPortrayals, normalizeCharacterName } from "@/lib/lineage";

describe("normalizeCharacterName", () => {
  it("collapses hyphen, space, and case variants of the same name", () => {
    expect(normalizeCharacterName("Wong Fei-Hung")).toBe("wongfeihung");
    expect(normalizeCharacterName("Wong Fei-hung")).toBe("wongfeihung");
    expect(normalizeCharacterName("Wong Fei Hung")).toBe("wongfeihung");
    expect(normalizeCharacterName("wong fei hung")).toBe("wongfeihung");
  });

  it("does not collapse genuinely different names", () => {
    expect(normalizeCharacterName("Lung")).not.toBe(normalizeCharacterName("Dragon"));
    expect(normalizeCharacterName("Wong Fei-Hung")).not.toBe(normalizeCharacterName("Wong Kei-Ying"));
  });
});

describe("getPortrayals", () => {
  it("short-circuits to [] for a single-word name without querying the database", async () => {
    // No DATABASE_URL/prisma connection is available in this unit test --
    // if this ever reaches the $queryRaw call it will throw, so a clean
    // resolved [] here confirms the single-word guardrail runs first.
    await expect(getPortrayals("Dragon")).resolves.toEqual([]);
    await expect(getPortrayals("  Monk  ")).resolves.toEqual([]);
  });

  it("short-circuits to [] when every name/alias in the array is single-word", async () => {
    await expect(getPortrayals(["Dragon", "Monk"])).resolves.toEqual([]);
    await expect(getPortrayals([])).resolves.toEqual([]);
  });

  it("still attempts the lookup when at least one alias is multi-word, even alongside single-word ones", async () => {
    // Mirrors the single-name test's approach from the opposite direction:
    // a name/alias array isn't disqualified just because one entry in it
    // is single-word -- confirmed here by reaching the (connectionless)
    // $queryRaw call and rejecting, rather than resolving to [].
    await expect(getPortrayals(["Dragon", "Lam Sai Wing"])).rejects.toThrow();
  });
});
