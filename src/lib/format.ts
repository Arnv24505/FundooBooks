/**
 * Gutendex stores author names as "Last, First" (sometimes with birth/death
 * years, e.g. "Shakespeare, William, 1564-1616"). The designs render
 * "by First Last", so normalise the name for display everywhere.
 */
export function formatAuthorName(name?: string | null): string {
  const raw = (name ?? "").trim();
  if (!raw) return "Unknown author";

  const parts = raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => !/^\d{3,4}(-\d{3,4})?$/.test(part));

  if (parts.length >= 2) {
    const [last, ...rest] = parts;
    return `${rest.join(" ")} ${last}`.trim();
  }

  return parts[0] ?? raw;
}

/** Joins a list of author names for compact display. */
export function formatAuthors(authors?: { name: string }[] | null): string {
  if (!authors || authors.length === 0) return "Unknown author";
  return authors.map((author) => formatAuthorName(author.name)).join(", ");
}
