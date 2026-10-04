// utils/utils.ts: address and date/time formatting for the staff UI, and the Europe/Brussels calendar helpers that keep
// opening hours, schedule overrides and ready times independent of the browser's timezone.
// Run: `vp test run tests/utils/utils.test.ts`.
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import {
  belPriceFormat,
  brusselsDateISO,
  brusselsDateTimeLocalToISO,
  formatAddress,
  formatDate,
  formatPrice,
  formatTimeOnly,
  getStreetAndDistance,
  isoToBrusselsDateTimeLocal,
  shiftBrusselsDate,
  timeToRFC3339,
} from '~/utils/utils'
import type { Address } from '~/types'
import { setFlags } from '../support/flags'

/** Intl separates thousands and the euro sign with (narrow) no-break spaces: compare with plain spaces. */
const plain = (text: string) => text.replace(/[  ]/gu, ' ')

const address = (overrides: Partial<Address> = {}): Address => ({
  id: 'a-1',
  streetName: 'Rue Saint-Gilles',
  houseNumber: '12',
  boxNumber: null,
  municipalityName: 'Liège',
  postcode: '4000',
  distance: 1500,
  ...overrides,
})

describe('formatAddress', () => {
  it('writes "street number, postcode – municipality"', () => {
    expect(formatAddress(address())).toBe('Rue Saint-Gilles 12, 4000 – Liège')
  })

  it('adds the box number after a slash', () => {
    expect(formatAddress(address({ boxNumber: '3B' }))).toBe(
      'Rue Saint-Gilles 12 / 3B, 4000 – Liège',
    )
  })

  it('is empty for no address', () => {
    expect(formatAddress(null)).toBe('')
  })
})

describe('getStreetAndDistance', () => {
  it('shows the distance in km with a decimal comma', () => {
    expect(getStreetAndDistance(address({ distance: 1500 }))).toBe('Rue Saint-Gilles 12 (1,5 km)')
  })

  it('drops the decimals of a whole number of km and keeps at most two', () => {
    expect(getStreetAndDistance(address({ distance: 3000 }))).toBe('Rue Saint-Gilles 12 (3 km)')
    expect(getStreetAndDistance(address({ distance: 1234 }))).toBe('Rue Saint-Gilles 12 (1,23 km)')
  })

  it('is empty for no address', () => {
    expect(getStreetAndDistance(null)).toBe('')
  })
})

describe('formatPrice', () => {
  it('formats euros the Belgian way, always with two decimals', () => {
    expect(plain(formatPrice(12.5))).toBe('12,50 €')
    expect(plain(formatPrice(0))).toBe('0,00 €')
    expect(plain(formatPrice(1234.5))).toBe('1 234,50 €')
  })

  it('accepts the decimal strings the API sends', () => {
    expect(plain(formatPrice('7.9'))).toBe('7,90 €')
  })

  it('rounds to the cent', () => {
    expect(plain(formatPrice('2.346'))).toBe('2,35 €')
  })

  it('exposes the formatter it uses', () => {
    expect(belPriceFormat.resolvedOptions()).toMatchObject({ currency: 'EUR', locale: 'fr-BE' })
  })
})

describe('formatDate', () => {
  // Built from local components so the wall-clock time shown is the same whatever the machine's timezone.
  const iso = new Date(2026, 9, 4, 14, 5).toISOString()

  it('defaults to the Belgian French format, 24-hour clock', () => {
    expect(formatDate(iso)).toBe('4 oct. 2026, 14:05')
  })

  it('formats for the requested locale', () => {
    expect(formatDate(iso, 'en')).toBe('Oct 4, 2026, 14:05')
  })

  it('maps the app locales zh and nl to their regional formats', () => {
    expect(formatDate(iso, 'zh')).toBe('2026年10月4日 14:05')
    expect(formatDate(iso, 'nl')).toBe('4 okt 2026, 14:05')
  })

  it('shows midnight as 00:00, never 24:00', () => {
    expect(formatDate(new Date(2026, 9, 5, 0, 0).toISOString())).toBe('5 oct. 2026, 00:00')
  })
})

describe('formatTimeOnly', () => {
  const iso = new Date(2026, 9, 4, 9, 7).toISOString()

  it('shows hours and minutes on a 24-hour clock', () => {
    expect(formatTimeOnly(iso)).toBe('09:07')
    expect(formatTimeOnly(iso, 'en')).toBe('09:07')
    expect(formatTimeOnly(iso, 'zh')).toBe('09:07')
    expect(formatTimeOnly(iso, 'nl')).toBe('09:07')
    expect(formatTimeOnly(new Date(2026, 9, 5, 0, 0).toISOString())).toBe('00:00')
  })

  describe('with unusable input', () => {
    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('shows a placeholder for an invalid date, quietly outside dev', () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {})
      expect(formatTimeOnly('not a date')).toBe('--:--')
      expect(error).not.toHaveBeenCalled()
    })

    it('logs the invalid date in dev', () => {
      setFlags({ dev: true })
      const error = vi.spyOn(console, 'error').mockImplementation(() => {})
      expect(formatTimeOnly('not a date')).toBe('--:--')
      expect(error).toHaveBeenCalledExactlyOnceWith('Invalid date string:', 'not a date')
    })

    it('shows the placeholder when the locale cannot be formatted, logging it in dev', () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {})
      expect(formatTimeOnly(iso, 'not_a_locale')).toBe('--:--')
      expect(error).not.toHaveBeenCalled()

      setFlags({ dev: true })
      expect(formatTimeOnly(iso, 'not_a_locale')).toBe('--:--')
      expect(error).toHaveBeenCalledExactlyOnceWith(
        'Date formatting error:',
        expect.any(RangeError),
      )
    })
  })
})

describe('Europe/Brussels calendar', () => {
  describe('brusselsDateISO', () => {
    it('is the Brussels date, not the UTC date', () => {
      // 22:30 UTC on 4 October is 00:30 on 5 October in Brussels (CEST, UTC+2).
      expect(brusselsDateISO(new Date('2026-10-04T22:30:00Z'))).toBe('2026-10-05')
      expect(brusselsDateISO(new Date('2026-10-04T21:30:00Z'))).toBe('2026-10-04')
    })

    it('follows winter time (UTC+1)', () => {
      expect(brusselsDateISO(new Date('2026-12-31T23:30:00Z'))).toBe('2027-01-01')
      expect(brusselsDateISO(new Date('2026-12-31T22:59:00Z'))).toBe('2026-12-31')
    })

    it('defaults to now', () => {
      vi.useFakeTimers({ toFake: ['Date'] })
      try {
        vi.setSystemTime(new Date('2026-10-04T22:30:00Z'))
        expect(brusselsDateISO()).toBe('2026-10-05')
      } finally {
        vi.useRealTimers()
      }
    })
  })

  describe('shiftBrusselsDate', () => {
    it.each([
      ['2026-10-04', 1, '2026-10-05'],
      ['2026-10-31', 1, '2026-11-01'],
      ['2026-12-31', 1, '2027-01-01'],
      ['2026-03-01', -1, '2026-02-28'],
      ['2028-03-01', -1, '2028-02-29'],
      ['2026-10-24', 3, '2026-10-27'],
      ['2026-10-04', 0, '2026-10-04'],
      ['2026-10-04', 30, '2026-11-03'],
    ])('%s %i day(s) -> %s', (date, days, want) => {
      expect(shiftBrusselsDate(date, days)).toBe(want)
    })

    it('reads a missing month or day as the first of the month / of January', () => {
      expect(shiftBrusselsDate('2026-10', 1)).toBe('2026-10-02')
      expect(shiftBrusselsDate('2026', 1)).toBe('2026-01-02')
    })

    it('crosses the DST changes without losing or gaining a day', () => {
      expect(shiftBrusselsDate('2026-03-28', 1)).toBe('2026-03-29')
      expect(shiftBrusselsDate('2026-03-29', 1)).toBe('2026-03-30')
      expect(shiftBrusselsDate('2026-10-25', 1)).toBe('2026-10-26')
    })
  })

  describe('brusselsDateTimeLocalToISO', () => {
    it('converts summer wall-clock time (UTC+2)', () => {
      expect(brusselsDateTimeLocalToISO('2026-07-01T12:00')).toBe('2026-07-01T10:00:00.000Z')
    })

    it('converts winter wall-clock time (UTC+1)', () => {
      expect(brusselsDateTimeLocalToISO('2026-01-15T12:00')).toBe('2026-01-15T11:00:00.000Z')
    })

    it('crosses midnight and year ends', () => {
      expect(brusselsDateTimeLocalToISO('2026-01-01T00:30')).toBe('2025-12-31T23:30:00.000Z')
    })

    it('ignores anything after the minutes', () => {
      expect(brusselsDateTimeLocalToISO('2026-07-01T12:00:45')).toBe('2026-07-01T10:00:00.000Z')
    })

    it('does not depend on the machine timezone', () => {
      const previous = process.env.TZ
      try {
        process.env.TZ = 'America/New_York'
        expect(brusselsDateTimeLocalToISO('2026-07-01T12:00')).toBe('2026-07-01T10:00:00.000Z')
        process.env.TZ = 'Asia/Tokyo'
        expect(brusselsDateTimeLocalToISO('2026-07-01T12:00')).toBe('2026-07-01T10:00:00.000Z')
      } finally {
        if (previous === undefined) delete process.env.TZ
        else process.env.TZ = previous
      }
    })

    it.each([null, undefined, '', 'tomorrow', '2026-07-01', '01/07/2026 12:00'])(
      'is null for %j',
      (input) => {
        expect(brusselsDateTimeLocalToISO(input)).toBeNull()
      },
    )
  })

  describe('isoToBrusselsDateTimeLocal', () => {
    it('renders a UTC instant as Brussels wall-clock time for a datetime-local input', () => {
      expect(isoToBrusselsDateTimeLocal('2026-07-01T10:00:00.000Z')).toBe('2026-07-01T12:00')
      expect(isoToBrusselsDateTimeLocal('2026-01-15T11:00:00Z')).toBe('2026-01-15T12:00')
    })

    it('shows the first minutes of the day as 00:xx, never 24:xx', () => {
      expect(isoToBrusselsDateTimeLocal('2026-10-04T22:05:00Z')).toBe('2026-10-05T00:05')
    })

    it('round-trips with brusselsDateTimeLocalToISO, so open -> save does not shift the time', () => {
      for (const local of ['2026-07-01T12:00', '2026-01-15T08:45', '2026-12-31T23:59']) {
        const iso = brusselsDateTimeLocalToISO(local)
        expect(isoToBrusselsDateTimeLocal(iso)).toBe(local)
      }
    })

    it.each([null, undefined, '', 'garbage'])('is empty for %j', (input) => {
      expect(isoToBrusselsDateTimeLocal(input)).toBe('')
    })
  })
})

describe('timeToRFC3339', () => {
  const withTimezone = (tz: string, run: () => void) => {
    const previous = process.env.TZ
    vi.useFakeTimers({ toFake: ['Date'] })
    try {
      process.env.TZ = tz
      run()
    } finally {
      vi.useRealTimers()
      if (previous === undefined) delete process.env.TZ
      else process.env.TZ = previous
    }
  }

  it('puts the time on today (local) with the local UTC offset, east of Greenwich', () => {
    withTimezone('Europe/Brussels', () => {
      vi.setSystemTime(new Date('2026-10-04T10:00:00Z'))
      expect(timeToRFC3339('18:45')).toBe('2026-10-04T18:45:00+02:00')
    })
  })

  it('uses a negative offset west of Greenwich', () => {
    withTimezone('America/New_York', () => {
      vi.setSystemTime(new Date('2026-01-15T12:00:00Z'))
      expect(timeToRFC3339('09:05')).toBe('2026-01-15T09:05:00-05:00')
    })
  })

  it('writes half-hour offsets', () => {
    withTimezone('Asia/Kolkata', () => {
      vi.setSystemTime(new Date('2026-10-04T10:00:00Z'))
      expect(timeToRFC3339('23:59')).toBe('2026-10-04T23:59:00+05:30')
    })
  })

  it('writes UTC as +00:00', () => {
    withTimezone('UTC', () => {
      vi.setSystemTime(new Date('2026-10-04T10:00:00Z'))
      expect(timeToRFC3339('00:00')).toBe('2026-10-04T00:00:00+00:00')
    })
  })

  it('zeroes the seconds and treats a missing minute part as 0', () => {
    withTimezone('UTC', () => {
      vi.setSystemTime(new Date('2026-10-04T10:00:59.999Z'))
      expect(timeToRFC3339('7')).toBe('2026-10-04T07:00:00+00:00')
    })
  })

  it('treats an empty string as midnight', () => {
    withTimezone('UTC', () => {
      vi.setSystemTime(new Date('2026-10-04T10:00:00Z'))
      expect(timeToRFC3339('')).toBe('2026-10-04T00:00:00+00:00')
    })
  })
})
