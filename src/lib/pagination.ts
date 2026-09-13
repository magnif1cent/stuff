// Collapses a long page range to first, last, the current page and its
// immediate neighbors, with "ellipsis" filling the gaps -- e.g.
// 1, ellipsis, 9, 10, 11, ellipsis, 20. Below the threshold there's nothing
// to collapse, so every page just shows.
const COLLAPSE_THRESHOLD = 7;

export function pageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= COLLAPSE_THRESHOLD) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const left = Math.max(2, current - 1);
  const right = Math.min(total - 1, current + 1);

  const pages: (number | "ellipsis")[] = [1];
  if (left > 2) pages.push("ellipsis");
  for (let i = left; i <= right; i++) pages.push(i);
  if (right < total - 1) pages.push("ellipsis");
  pages.push(total);
  return pages;
}
