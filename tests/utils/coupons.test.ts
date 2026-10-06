// Coupon logic of the coupons page: the form (defaults, seeding from a coupon, validation), the create / update input,
// the list filters and pagination, and the labels.
import { describe, expect, it } from 'vite-plus/test'
import type { Coupon, CouponStatus } from '~/types'
import {
  buildCouponInput,
  couponToForm,
  defaultCouponForm,
  discountLabel,
  filterCoupons,
  formatDateRange,
  paginate,
  periodLabel,
  statusMeta,
  validateCouponForm,
  type CouponFilters,
} from '~/utils/coupons'
import { fakeT } from '../helpers/i18n'

const makeCoupon = (overrides: Partial<Coupon> = {}): Coupon => ({
  id: 'c-1',
  code: 'WELCOME10',
  discountType: 'PERCENTAGE',
  discountValue: '10',
  minOrderAmount: null,
  maxUses: null,
  maxUsesPerUser: null,
  usedCount: 0,
  isActive: true,
  status: 'ACTIVE',
  validFrom: null,
  validUntil: null,
  createdAt: '2026-10-01T10:00:00.000Z',
  ...overrides,
})

const validForm = () => ({
  ...defaultCouponForm(),
  code: 'summer',
  discountValue: '15',
})

describe('coupon form', () => {
  it('starts as an active percentage coupon with every other field empty', () => {
    expect(defaultCouponForm()).toEqual({
      code: '',
      discountType: 'PERCENTAGE',
      discountValue: '',
      minOrderAmount: '',
      maxUses: '',
      maxUsesPerUser: '',
      isActive: true,
      validFrom: '',
      validUntil: '',
    })
  })

  it('returns a fresh object each time', () => {
    expect(defaultCouponForm()).not.toBe(defaultCouponForm())
  })

  it('seeds the edit form from a coupon, validity in Brussels wall-clock time (DST aware)', () => {
    const form = couponToForm(
      makeCoupon({
        code: 'XMAS',
        discountType: 'FIXED',
        discountValue: '5.00',
        minOrderAmount: '20.00',
        maxUses: 100,
        maxUsesPerUser: 1,
        isActive: false,
        validFrom: '2026-12-01T09:30:00.000Z', // CET, UTC+1
        validUntil: '2026-07-15T21:30:00.000Z', // CEST, UTC+2
      }),
    )
    expect(form).toEqual({
      code: 'XMAS',
      discountType: 'FIXED',
      discountValue: '5.00',
      minOrderAmount: '20.00',
      maxUses: '100',
      maxUsesPerUser: '1',
      isActive: false,
      validFrom: '2026-12-01T10:30',
      validUntil: '2026-07-15T23:30',
    })
  })

  it('seeds empty fields for the limits and dates a coupon does not have', () => {
    const form = couponToForm(makeCoupon({ maxUses: null, maxUsesPerUser: undefined as never }))
    expect(form).toMatchObject({
      minOrderAmount: '',
      maxUses: '',
      maxUsesPerUser: '',
      validFrom: '',
      validUntil: '',
    })
  })

  it('keeps a limit of 0 (not "no limit") when seeding', () => {
    expect(couponToForm(makeCoupon({ maxUses: 0 })).maxUses).toBe('0')
  })
})

describe('validateCouponForm', () => {
  it('accepts a valid form', () => {
    expect(validateCouponForm(validForm(), fakeT)).toBe('')
  })

  it.each(['', '   '])('requires a code (%j)', (code) => {
    expect(validateCouponForm({ ...validForm(), code }, fakeT)).toBe('coupons.code is required')
  })

  it.each(['', '0', '-5', 'abc', '   ', '0.00'])(
    'requires a value above 0 (%j)',
    (discountValue) => {
      expect(validateCouponForm({ ...validForm(), discountValue }, fakeT)).toBe(
        'coupons.value must be greater than 0',
      )
    },
  )

  it('rejects a percentage above 100 but accepts exactly 100', () => {
    expect(validateCouponForm({ ...validForm(), discountValue: '100.01' }, fakeT)).toBe(
      'coupons.errors.percentageMax',
    )
    expect(validateCouponForm({ ...validForm(), discountValue: '100' }, fakeT)).toBe('')
  })

  it('accepts a fixed amount above 100', () => {
    expect(
      validateCouponForm({ ...validForm(), discountType: 'FIXED', discountValue: '250' }, fakeT),
    ).toBe('')
  })

  it('requires the end of the validity to be after its start', () => {
    const base = { ...validForm(), validFrom: '2026-10-04T10:00' }
    const expected = 'coupons.validUntil must be after coupons.validFrom'
    expect(validateCouponForm({ ...base, validUntil: '2026-10-04T09:59' }, fakeT)).toBe(expected)
    expect(validateCouponForm({ ...base, validUntil: '2026-10-04T10:00' }, fakeT)).toBe(expected)
    expect(validateCouponForm({ ...base, validUntil: '2026-10-04T10:01' }, fakeT)).toBe('')
  })

  it('accepts a start without an end, and an end without a start', () => {
    expect(validateCouponForm({ ...validForm(), validFrom: '2026-10-04T10:00' }, fakeT)).toBe('')
    expect(validateCouponForm({ ...validForm(), validUntil: '2026-10-04T10:00' }, fakeT)).toBe('')
  })

  it('reports the first problem only (code before value)', () => {
    expect(validateCouponForm(defaultCouponForm(), fakeT)).toBe('coupons.code is required')
  })
})

describe('buildCouponInput', () => {
  it.each<[string, unknown, string | null]>([
    ['a text amount', '20.00', '20.00'],
    ['an empty text', '', null],
    ['a number from a number input', 12.5, '12.5'],
    ['a number input emptied to 0', 0, null],
    ['a number input holding NaN', Number.NaN, null],
  ])('sends the minimum order as %s', (_name, minOrderAmount, expected) => {
    const form = { ...validForm(), minOrderAmount: minOrderAmount as string }
    expect(buildCouponInput(form).minOrderAmount).toBe(expected)
  })

  it('trims and upper-cases the code, sends numbers as numbers and empty optionals as null', () => {
    expect(buildCouponInput({ ...validForm(), code: '  summer15 ' })).toEqual({
      code: 'SUMMER15',
      discountType: 'PERCENTAGE',
      discountValue: '15',
      minOrderAmount: null,
      maxUses: null,
      maxUsesPerUser: null,
      isActive: true,
      validFrom: null,
      validUntil: null,
    })
  })

  it('carries the limits and the minimum order', () => {
    const input = buildCouponInput({
      ...validForm(),
      discountType: 'FIXED',
      minOrderAmount: '25.50',
      maxUses: '200',
      maxUsesPerUser: '2',
      isActive: false,
    })
    expect(input).toMatchObject({
      discountType: 'FIXED',
      minOrderAmount: '25.50',
      maxUses: 200,
      maxUsesPerUser: 2,
      isActive: false,
    })
  })

  it('sends a limit of "0" as 0 (a limit), not as no limit', () => {
    expect(buildCouponInput({ ...validForm(), maxUses: '0' }).maxUses).toBe(0)
  })

  it('reads the validity as Brussels time and sends UTC instants, whatever the browser timezone', () => {
    const input = buildCouponInput({
      ...validForm(),
      validFrom: '2026-01-15T00:00', // CET
      validUntil: '2026-07-15T23:59', // CEST
    })
    expect(input.validFrom).toBe('2026-01-14T23:00:00.000Z')
    expect(input.validUntil).toBe('2026-07-15T21:59:00.000Z')
  })

  it('round-trips with the edit form: open then save changes nothing', () => {
    const coupon = makeCoupon({
      code: 'KEEP',
      discountType: 'FIXED',
      discountValue: '3.50',
      minOrderAmount: '15.00',
      maxUses: 10,
      maxUsesPerUser: 1,
      validFrom: '2026-03-29T00:30:00.000Z', // the day of the spring DST change
      validUntil: '2026-10-25T01:30:00.000Z',
    })
    expect(buildCouponInput(couponToForm(coupon))).toEqual({
      code: 'KEEP',
      discountType: 'FIXED',
      discountValue: '3.50',
      minOrderAmount: '15.00',
      maxUses: 10,
      maxUsesPerUser: 1,
      isActive: true,
      validFrom: coupon.validFrom,
      validUntil: coupon.validUntil,
    })
  })
})

describe('filterCoupons', () => {
  const statuses: CouponStatus[] = ['ACTIVE', 'INACTIVE', 'SCHEDULED', 'EXPIRED', 'EXHAUSTED']
  const coupons = [
    ...statuses.map((status) =>
      makeCoupon({ id: status, code: `C-${status}`, status, discountType: 'PERCENTAGE' }),
    ),
    makeCoupon({ id: 'fixed', code: 'FIVE', status: 'ACTIVE', discountType: 'FIXED' }),
  ]
  const base: CouponFilters = {
    search: '',
    isMobile: false,
    mobileStatus: 'all',
    status: 'all',
    type: 'all',
  }
  const ids = (filters: Partial<CouponFilters>) =>
    filterCoupons(coupons, { ...base, ...filters }).map((c) => c.id)

  it('keeps everything without filters', () => {
    expect(ids({})).toHaveLength(6)
  })

  it('searches the code, ignoring case', () => {
    expect(ids({ search: 'five' })).toEqual(['fixed'])
    expect(ids({ search: 'c-exp' })).toEqual(['EXPIRED'])
    expect(ids({ search: 'nothing' })).toEqual([])
  })

  it('desktop: "active" is the active coupons, "inactive" is every other one', () => {
    expect(ids({ status: 'active' })).toEqual(['ACTIVE', 'fixed'])
    expect(ids({ status: 'inactive' })).toEqual(['INACTIVE', 'SCHEDULED', 'EXPIRED', 'EXHAUSTED'])
  })

  it('desktop: ignores the phone status rail', () => {
    expect(ids({ mobileStatus: 'SCHEDULED' })).toHaveLength(6)
  })

  it('phone: filters on the status rail, "expired" also lists the exhausted coupons', () => {
    expect(ids({ isMobile: true, mobileStatus: 'SCHEDULED' })).toEqual(['SCHEDULED'])
    expect(ids({ isMobile: true, mobileStatus: 'ACTIVE' })).toEqual(['ACTIVE', 'fixed'])
    expect(ids({ isMobile: true, mobileStatus: 'INACTIVE' })).toEqual(['INACTIVE'])
    expect(ids({ isMobile: true, mobileStatus: 'EXPIRED' })).toEqual(['EXPIRED', 'EXHAUSTED'])
    expect(ids({ isMobile: true, mobileStatus: 'all' })).toHaveLength(6)
  })

  it('phone: ignores the desktop status filter', () => {
    expect(ids({ isMobile: true, status: 'inactive' })).toHaveLength(6)
  })

  it('filters on the discount type, with the other filters', () => {
    expect(ids({ type: 'FIXED' })).toEqual(['fixed'])
    expect(ids({ type: 'PERCENTAGE', status: 'active' })).toEqual(['ACTIVE'])
    expect(ids({ type: 'FIXED', search: 'c-' })).toEqual([])
  })
})

describe('paginate', () => {
  const items = Array.from({ length: 25 }, (_, i) => i + 1)

  it('returns the 1-based page', () => {
    expect(paginate(items, 1, 10)).toEqual(items.slice(0, 10))
    expect(paginate(items, 3, 10)).toEqual([21, 22, 23, 24, 25])
  })

  it('returns nothing past the last page', () => {
    expect(paginate(items, 4, 10)).toEqual([])
    expect(paginate([], 1, 10)).toEqual([])
  })
})

describe('statusMeta', () => {
  it.each<[CouponStatus, string, string]>([
    ['ACTIVE', 'coupons.active', 'success'],
    ['INACTIVE', 'coupons.inactive', 'neutral'],
    ['EXPIRED', 'coupons.expired', 'warning'],
    ['SCHEDULED', 'coupons.scheduled', 'info'],
    ['EXHAUSTED', 'coupons.exhausted', 'warning'],
  ])('%s is labelled %s with a %s chip', (status, label, chip) => {
    expect(statusMeta(status, fakeT)).toMatchObject({ label, chip })
  })

  it('has an icon and a tone per status, and nothing for an unknown status', () => {
    expect(statusMeta('ACTIVE', fakeT)).toMatchObject({
      icon: 'i-lucide-circle-check',
      tone: 'bg-success text-inverted',
    })
    expect(statusMeta('NOPE' as CouponStatus, fakeT)).toBeUndefined()
  })
})

describe('discountLabel', () => {
  it('shows a percentage with a non-breaking space before the sign', () => {
    expect(discountLabel(makeCoupon({ discountValue: '15' }))).toBe('−15 %')
  })

  it('shows a fractional percentage with the French decimal comma', () => {
    expect(discountLabel(makeCoupon({ discountValue: '12.5' }))).toBe('−12,5 %')
  })

  it('shows a fixed amount in euros', () => {
    const label = discountLabel(makeCoupon({ discountType: 'FIXED', discountValue: '5' }))
    expect(label.startsWith('−')).toBe(true)
    expect(label).toMatch(/5,00\s*€$/u)
  })
})

describe('validity labels', () => {
  // Midday UTC: the same calendar day in Brussels and in any browser timezone.
  const from = '2026-10-04T12:00:00.000Z'
  const until = '2026-10-31T12:00:00.000Z'

  it('periodLabel: from-to, until, or no end', () => {
    expect(periodLabel(makeCoupon({ validFrom: from, validUntil: until }), fakeT)).toBe(
      'coupons.fromTo{"from":"04/10/2026","to":"31/10/2026"}',
    )
    expect(periodLabel(makeCoupon({ validUntil: until }), fakeT)).toBe(
      'coupons.until{"date":"31/10/2026"}',
    )
    expect(periodLabel(makeCoupon(), fakeT)).toBe('coupons.noEnd')
    expect(periodLabel(makeCoupon({ validFrom: from }), fakeT)).toBe('coupons.noEnd')
  })

  it('periodLabel reads the day in Europe/Brussels', () => {
    // 23:30 UTC on 31 Oct is already 1 Nov in Brussels (CET).
    expect(periodLabel(makeCoupon({ validUntil: '2026-10-31T23:30:00.000Z' }), fakeT)).toBe(
      'coupons.until{"date":"01/11/2026"}',
    )
  })

  it('formatDateRange reads the days in Europe/Brussels, whatever the timezone of the device', () => {
    // 23:30 UTC on 31 Oct is already 1 Nov in Brussels (CET); 22:30 UTC on 3 Oct is 4 Oct (CEST).
    expect(formatDateRange('2026-10-03T22:30:00.000Z', '2026-10-31T23:30:00.000Z')).toBe(
      '04/10/2026 - 01/11/2026',
    )
    expect(formatDateRange('2026-10-03T22:30:00.000Z', null)).toBe('04/10/2026 -')
    expect(formatDateRange(null, '2026-10-31T23:30:00.000Z')).toBe('- 01/11/2026')
  })

  it('formatDateRange: both ends, one end, or none', () => {
    expect(formatDateRange(from, until)).toBe('04/10/2026 - 31/10/2026')
    expect(formatDateRange(from, null)).toBe('04/10/2026 -')
    expect(formatDateRange(null, until)).toBe('- 31/10/2026')
    expect(formatDateRange(null, null)).toBe('-')
  })
})
