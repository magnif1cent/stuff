import { describe, expect, it } from "vitest";
import { pageNumbers } from "@/lib/pagination";

describe("pageNumbers", () => {
  it("shows every page with no ellipsis when the total is small", () => {
    expect(pageNumbers(1, 4)).toEqual([1, 2, 3, 4]);
    expect(pageNumbers(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("always includes the first and last page once collapsed", () => {
    const pages = pageNumbers(10, 20);
    expect(pages[0]).toBe(1);
    expect(pages[pages.length - 1]).toBe(20);
  });

  it("collapses the middle into ellipsis on both sides when far from both ends", () => {
    expect(pageNumbers(10, 20)).toEqual([1, "ellipsis", 9, 10, 11, "ellipsis", 20]);
  });

  it("omits the leading ellipsis when the current page is near the start", () => {
    const pages = pageNumbers(2, 20);
    expect(pages).toEqual([1, 2, 3, "ellipsis", 20]);
  });

  it("omits the trailing ellipsis when the current page is near the end", () => {
    const pages = pageNumbers(19, 20);
    expect(pages).toEqual([1, "ellipsis", 18, 19, 20]);
  });

  it("never duplicates a page number", () => {
    for (let total = 1; total <= 30; total++) {
      for (let current = 1; current <= total; current++) {
        const pages = pageNumbers(current, total).filter((p) => p !== "ellipsis");
        expect(new Set(pages).size).toBe(pages.length);
      }
    }
  });
});
