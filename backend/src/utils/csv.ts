/** A small, correct CSV serializer — not worth a dependency for this.
 * Handles quoting for values containing commas, quotes, or newlines per
 * RFC 4180. */
export function toCSV<T extends Record<string, unknown>>(rows: T[], columns?: (keyof T)[]): string {
  if (rows.length === 0) {
    return columns ? columns.map(String).join(',') : '';
  }

  const cols = columns ?? (Object.keys(rows[0]) as (keyof T)[]);

  const escape = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    const str = value instanceof Date ? value.toISOString() : String(value);
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const header = cols.map((col) => escape(String(col))).join(',');
  const lines = rows.map((row) => cols.map((col) => escape(row[col])).join(','));
  return [header, ...lines].join('\n');
}
