export type PageToken = number | "...";

export function getVisiblePages(
  count: number,
  page: number,
  maxVisiblePages: number,
  isMobile: boolean
): PageToken[] {
  if (count <= maxVisiblePages) {
    return Array.from({ length: count }, (_, i) => i + 1);
  }

  if (isMobile) {
    if (page <= 2) {
      return [1, 2, 3, "...", count];
    } else if (page >= count - 1) {
      return [1, "...", count - 2, count - 1, count];
    } else {
      return [1, "...", page, "...", count];
    }
  }

  const delta = Math.floor(maxVisiblePages / 2);
  const range: number[] = [];
  const rangeWithDots: PageToken[] = [];

  for (
    let i = Math.max(2, page - delta);
    i <= Math.min(count - 1, page + delta);
    i++
  ) {
    range.push(i);
  }

  if (page - delta > 2) {
    rangeWithDots.push(1, "...");
  } else {
    rangeWithDots.push(1);
  }

  rangeWithDots.push(...range);

  if (page + delta < count - 1) {
    rangeWithDots.push("...", count);
  } else {
    rangeWithDots.push(count);
  }

  return rangeWithDots;
}
