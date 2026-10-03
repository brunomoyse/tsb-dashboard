import { brusselsDateISO, shiftBrusselsDate } from '~/utils/utils'

/*
 * Schedule overrides are keyed by a calendar date (a DATE column). Dates are
 * handled as plain "YYYY-MM-DD" strings so the browser timezone never shifts
 * them: local midnight serialised with toISOString() is the previous day in UTC.
 */

/** Default date of a new override: tomorrow in Europe/Brussels. */
export const defaultOverrideDate = (now: Date = new Date()): string =>
  shiftBrusselsDate(brusselsDateISO(now), 1)

/** Calendar date of an override returned by the API (UTC midnight). */
export const overrideDateKey = (iso: string): string => iso.slice(0, 10)

/** DateTime value the API expects for a calendar date: UTC midnight. */
export const overrideDateToGql = (date: string): string => `${date}T00:00:00Z`

/**
 * Inclusive list of calendar dates from start to end. An empty end, or an end
 * before start, gives start only.
 */
export const overrideDateRange = (start: string, end?: string | null): string[] => {
  const dates = [start]
  if (!end) return dates
  for (let d = shiftBrusselsDate(start, 1); d <= end; d = shiftBrusselsDate(d, 1)) {
    dates.push(d)
  }
  return dates
}

/** Long, localised label of an override date, independent of the browser timezone. */
export const formatOverrideDate = (iso: string, locale: string): string =>
  new Intl.DateTimeFormat(locale, {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(overrideDateToGql(overrideDateKey(iso))))
