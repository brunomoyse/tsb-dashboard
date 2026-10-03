import { describe, expect, it } from 'vitest'
import {
  defaultOverrideDate,
  formatOverrideDate,
  overrideDateKey,
  overrideDateRange,
  overrideDateToGql,
} from '~/utils/scheduleOverride'

describe('schedule override dates', () => {
  it('sends the picked calendar date as UTC midnight', () => {
    /*
     * Regression: `new Date('2026-10-05T00:00:00').toISOString()` in Brussels
     * is 2026-10-04T22:00:00Z, which the API stored as 4 October.
     */
    expect(overrideDateToGql('2026-10-05')).toBe('2026-10-05T00:00:00Z')
  })

  it('round-trips the date returned by the API', () => {
    const fromApi = '2026-10-05T00:00:00Z'
    expect(overrideDateKey(fromApi)).toBe('2026-10-05')
    expect(overrideDateToGql(overrideDateKey(fromApi))).toBe(fromApi)
  })

  it.each([
    { name: 'single day', start: '2026-10-05', end: '', want: ['2026-10-05'] },
    { name: 'end before start', start: '2026-10-05', end: '2026-10-01', want: ['2026-10-05'] },
    { name: 'across the DST change', start: '2026-10-24', end: '2026-10-27', want: ['2026-10-24', '2026-10-25', '2026-10-26', '2026-10-27'] },
    { name: 'across a month end', start: '2026-10-30', end: '2026-11-02', want: ['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02'] },
  ])('builds the range: $name', ({ start, end, want }) => {
    expect(overrideDateRange(start, end)).toEqual(want)
  })

  it.each([
    ['late evening in Brussels', '2026-10-04T21:30:00Z', '2026-10-05'],
    ['just after midnight in Brussels', '2026-10-04T22:30:00Z', '2026-10-06'],
    ['winter time', '2026-12-31T23:30:00Z', '2027-01-02'],
  ])('defaults to tomorrow in Brussels: %s', (_, now, want) => {
    expect(defaultOverrideDate(new Date(now))).toBe(want)
  })

  it('formats the calendar date, not the browser-local day', () => {
    expect(formatOverrideDate('2026-10-05T00:00:00Z', 'en-GB')).toMatch(/^Monday,? 05 October 2026$/u)
  })
})
