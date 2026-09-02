"use client";

import { useEffect } from "react";
import type { RefObject } from "react";

// Closes an open dropdown/menu on a click outside all of `refs` -- shared by
// every button-triggered dropdown in the app (AddToListControl, ShareButton,
// ListsNavMenu), which previously each left this out and only closed on an
// explicit re-click of their own toggle, on scroll, or not at all. `mousedown`
// rather than `click` so this fires before a target element's own `onClick`
// (e.g. a list item inside the menu), and only while `active` so idle menus
// don't pay for a document-wide listener.
export function useClickOutside(
  refs: RefObject<HTMLElement | null> | RefObject<HTMLElement | null>[],
  onOutside: () => void,
  active: boolean,
) {
  useEffect(() => {
    if (!active) return;
    const list = Array.isArray(refs) ? refs : [refs];
    function handlePointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (list.some((ref) => ref.current?.contains(target))) return;
      onOutside();
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [active, refs, onOutside]);
}
