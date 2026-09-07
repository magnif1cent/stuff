import { Filter } from "bad-words";

// Shared by any member-facing free-text vocabulary create (currently just
// fight scene tags — see /api/fight-scene-tags). Rejects the create outright
// rather than silently censoring it ("as***le"): a rejected create just asks
// the member to try a different name, which is a better outcome than a
// half-blanked-out tag going live. This only catches explicit profanity/
// slurs from the bad-words package's maintained list — it's not a defense
// against merely silly or joke tags, which still rely on admin cleanup at
// /admin/fight-scene-tags (see DECISIONS.md).
const filter = new Filter();

export function isBlockedContent(text: string): boolean {
  return filter.isProfane(text);
}
