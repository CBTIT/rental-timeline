/**
 * Parse lease date strings in various formats
 * @param s - Date string in format "YYYY-MM-DD" or "M/D/YYYY" or "MM/DD/YYYY"
 * @returns Parsed Date object or null if invalid
 */
export function parseLeaseDate(s: string): Date | null {
  if (!s) return null;
  const t = s.trim();

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
    const d = new Date(t + "T00:00:00");
    return isNaN(d.getTime()) ? null : d;
  }

  // M/D/YYYY or MM/DD/YYYY
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const month = Number(m[1]);
    const day = Number(m[2]);
    const year = Number(m[3]);
    const d = new Date(year, month - 1, day);
    return isNaN(d.getTime()) ? null : d;
  }

  return null;
}

/**
 * Calculate days between two dates
 * @param a - Start date
 * @param b - End date
 * @returns Number of days (can be negative)
 */
export function daysBetween(a: Date, b: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;

  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());

  return Math.round((utcB - utcA) / msPerDay);
}

/**
 * Get date string from day index
 * @param firstDate - Base date
 * @param dayIndex - Number of days to add
 * @returns Date string in format "YYYY-MM-DD"
 */
export function stringDateFromDayIndex(
  firstDate: Date,
  dayIndex: number,
): string {
  const d = new Date(firstDate);
  d.setDate(d.getDate() + dayIndex);
  return d.toDateString();
}

/**
 * Get Date object from day index
 * @param firstDate - Base date
 * @param dayIndex - Number of days to add
 * @returns New Date object
 */
export function dateFromDayIndex(firstDate: Date, dayIndex: number): Date {
  const d = new Date(firstDate);
  d.setDate(d.getDate() + dayIndex);
  return d;
}
