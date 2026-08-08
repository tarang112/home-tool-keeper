/** Shared item-name normalization so grouping and batch matching agree. */
export const normalizeGroupedItemName = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
