/**
 * Minimal relevance score for JSON-file-backed search (no database, no
 * search engine). Returns 0 when the fields don't match `query` at all,
 * otherwise a positive score where title matches outrank body matches.
 */
export function scoreTextMatch(query: string, fields: { title: string; body?: string[] }): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;

  let score = 0;
  const title = fields.title.toLowerCase();
  if (title === q) score += 100;
  else if (title.startsWith(q)) score += 60;
  else if (title.includes(q)) score += 40;

  for (const field of fields.body ?? []) {
    if (field?.toLowerCase().includes(q)) score += 10;
  }

  return score;
}

export function groupBy<T, K extends string | number>(items: T[], key: (item: T) => K): Record<K, T[]> {
  return items.reduce(
    (acc, item) => {
      const k = key(item);
      (acc[k] ??= []).push(item);
      return acc;
    },
    {} as Record<K, T[]>,
  );
}
