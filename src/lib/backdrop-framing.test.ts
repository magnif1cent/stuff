import { describe, expect, it } from "vitest";
import { backdropFramingStyle, parseBackdropFraming, resolveBackdropFraming } from "@/lib/backdrop-framing";

describe("parseBackdropFraming", () => {
  it("stores non-default values as-is", () => {
    expect(parseBackdropFraming({ focusX: 10, focusY: 80, scale: 1.5 })).toEqual({
      data: { backdropFocusX: 10, backdropFocusY: 80, backdropScale: 1.5 },
    });
  });

  it("stores default values as null", () => {
    expect(parseBackdropFraming({ focusX: 50, focusY: 25, scale: 1 })).toEqual({
      data: { backdropFocusX: null, backdropFocusY: null, backdropScale: null },
    });
  });

  it("rounds scale to two decimals", () => {
    expect(parseBackdropFraming({ focusX: 0, focusY: 100, scale: 1.23456 })).toEqual({
      data: { backdropFocusX: 0, backdropFocusY: 100, backdropScale: 1.23 },
    });
  });

  it.each([
    [{ focusX: -1, focusY: 25, scale: 1 }],
    [{ focusX: 101, focusY: 25, scale: 1 }],
    [{ focusX: 50.5, focusY: 25, scale: 1 }],
    [{ focusX: "50", focusY: 25, scale: 1 }],
    [{ focusX: 50, focusY: 25, scale: 0.9 }],
    [{ focusX: 50, focusY: 25, scale: 3 }],
    [{ focusX: 50, focusY: 25, scale: Number.NaN }],
    [{ focusX: 50, focusY: 25 }],
    [null],
  ])("rejects %j", (body) => {
    expect(parseBackdropFraming(body)).toHaveProperty("error");
  });
});

describe("resolveBackdropFraming / backdropFramingStyle", () => {
  it("defaults to the banner's original center-25% crop with no transform", () => {
    const framing = resolveBackdropFraming({ backdropFocusX: null, backdropFocusY: null, backdropScale: null });
    expect(backdropFramingStyle(framing)).toEqual({
      objectPosition: "50% 25%",
      transformOrigin: "50% 25%",
      transform: undefined,
    });
  });

  it("zooms around the focal point", () => {
    const framing = resolveBackdropFraming({ backdropFocusX: 30, backdropFocusY: 60, backdropScale: 1.8 });
    expect(backdropFramingStyle(framing)).toEqual({
      objectPosition: "30% 60%",
      transformOrigin: "30% 60%",
      transform: "scale(1.8)",
    });
  });
});
