import type { DengueCase } from '../types';

const DAY = 864e5;

/**
 * Cases whose reported_date falls within [now - dateFrom days, now - dateTo days].
 * dateFrom/dateTo are "days ago" (dateFrom > dateTo).
 */
export function filteredCases(cases: DengueCase[], dateFrom: number, dateTo: number): DengueCase[] {
  const now = Date.now();
  const from = now - dateFrom * DAY;
  const to = now - dateTo * DAY;
  return cases.filter((c) => {
    const t = new Date(c.reported_date).getTime();
    return t >= from && t <= to;
  });
}
