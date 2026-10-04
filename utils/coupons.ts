import type { Translate } from '~/utils/translate'
import type { Coupon, CouponStatus, CreateCouponInput, UpdateCouponInput } from '~/types'
import { brusselsDateTimeLocalToISO, formatPrice, isoToBrusselsDateTimeLocal } from '~/utils/utils'

/*
 * Pure coupon logic of pages/coupons.vue: the form model and its validation, the create / update inputs sent to the API,
 * the list filters and the labels. Nothing here reads the clock or the i18n instance: the caller passes `t`.
 */

/** The coupon dialog's model: every field is the raw text of its input. */
export interface CouponForm {
  code: string
  discountType: string
  discountValue: string
  minOrderAmount: string
  maxUses: string
  maxUsesPerUser: string
  isActive: boolean
  /** `<input type="datetime-local">` value: a Europe/Brussels wall-clock time. */
  validFrom: string
  validUntil: string
}

export const defaultCouponForm = (): CouponForm => ({
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

/** Seeds the edit dialog from a coupon; the validity dates round-trip through Brussels wall-clock time. */
export const couponToForm = (coupon: Coupon): CouponForm => ({
  code: coupon.code,
  discountType: coupon.discountType,
  discountValue: coupon.discountValue,
  minOrderAmount: coupon.minOrderAmount ?? '',
  maxUses: coupon.maxUses !== null && coupon.maxUses !== undefined ? String(coupon.maxUses) : '',
  maxUsesPerUser:
    coupon.maxUsesPerUser !== null && coupon.maxUsesPerUser !== undefined
      ? String(coupon.maxUsesPerUser)
      : '',
  isActive: coupon.isActive,
  validFrom: isoToBrusselsDateTimeLocal(coupon.validFrom),
  validUntil: isoToBrusselsDateTimeLocal(coupon.validUntil),
})

/**
 * Validates the form for immediate feedback (the backend stays authoritative). Returns the error message, or '' when
 * the form is valid.
 */
export const validateCouponForm = (form: CouponForm, t: Translate): string => {
  if (!form.code.trim()) {
    return `${t('coupons.code')} is required`
  }
  const val = Number(form.discountValue)
  if (!form.discountValue || isNaN(val) || val <= 0) {
    return `${t('coupons.value')} must be greater than 0`
  }
  // Mirror the backend validateDiscount rule.
  if (form.discountType === 'PERCENTAGE' && val > 100) {
    return t('coupons.errors.percentageMax')
  }
  if (form.validFrom && form.validUntil) {
    if (new Date(form.validUntil) <= new Date(form.validFrom)) {
      return `${t('coupons.validUntil')} must be after ${t('coupons.validFrom')}`
    }
  }
  return ''
}

/**
 * The input sent to createCoupon / updateCoupon (both take the same fields): the code upper-cased and trimmed, empty
 * optional fields as null, the validity dates read as Brussels wall-clock time and sent as UTC instants.
 */
export const buildCouponInput = (form: CouponForm): CreateCouponInput & UpdateCouponInput => ({
  code: form.code.trim().toUpperCase(),
  discountType: form.discountType,
  discountValue: form.discountValue,
  minOrderAmount: form.minOrderAmount ? String(form.minOrderAmount) : null,
  maxUses: form.maxUses ? Number(form.maxUses) : null,
  maxUsesPerUser: form.maxUsesPerUser ? Number(form.maxUsesPerUser) : null,
  isActive: form.isActive,
  validFrom: brusselsDateTimeLocalToISO(form.validFrom),
  validUntil: brusselsDateTimeLocalToISO(form.validUntil),
})

export type MobileCouponStatus = 'all' | 'ACTIVE' | 'SCHEDULED' | 'INACTIVE' | 'EXPIRED'

export interface CouponFilters {
  search: string
  isMobile: boolean
  /** Phone layout: the status chip rail ("EXPIRED" also matches the exhausted coupons). */
  mobileStatus: MobileCouponStatus
  /** Desktop layout: "inactive" is every coupon that is not currently active. */
  status: 'all' | 'active' | 'inactive'
  type: 'all' | 'PERCENTAGE' | 'FIXED'
}

export const filterCoupons = (coupons: Coupon[], filters: CouponFilters): Coupon[] =>
  coupons.filter((c) => {
    if (filters.search && !c.code.toLowerCase().includes(filters.search.toLowerCase())) return false
    if (filters.isMobile) {
      if (
        filters.mobileStatus === 'EXPIRED'
          ? c.status !== 'EXPIRED' && c.status !== 'EXHAUSTED'
          : filters.mobileStatus !== 'all' && c.status !== filters.mobileStatus
      )
        return false
    } else {
      if (filters.status === 'active' && c.status !== 'ACTIVE') return false
      if (filters.status === 'inactive' && c.status === 'ACTIVE') return false
    }
    if (filters.type !== 'all' && c.discountType !== filters.type) return false
    return true
  })

/** One page (1-based) of a list. */
export const paginate = <T>(items: T[], page: number, pageSize: number): T[] => {
  const start = (page - 1) * pageSize
  return items.slice(start, start + pageSize)
}

export const statusMeta = (status: CouponStatus, t: Translate) => {
  switch (status) {
    case 'ACTIVE':
      return {
        label: t('coupons.active'),
        icon: 'i-lucide-circle-check',
        tone: 'bg-success text-inverted',
        chip: 'success' as const,
      }
    case 'INACTIVE':
      return {
        label: t('coupons.inactive'),
        icon: 'i-lucide-circle-x',
        tone: 'bg-accented text-muted',
        chip: 'neutral' as const,
      }
    case 'EXPIRED':
      return {
        label: t('coupons.expired'),
        icon: 'i-lucide-clock-alert',
        tone: 'bg-warning text-inverted',
        chip: 'warning' as const,
      }
    case 'SCHEDULED':
      return {
        label: t('coupons.scheduled'),
        icon: 'i-lucide-calendar-clock',
        tone: 'bg-info text-inverted',
        chip: 'info' as const,
      }
    case 'EXHAUSTED':
      return {
        label: t('coupons.exhausted'),
        icon: 'i-lucide-battery-low',
        tone: 'bg-warning text-inverted',
        chip: 'warning' as const,
      }
  }
}

/** "−15 %" for a percentage coupon, "−5,00 €" for a fixed one. */
export const discountLabel = (coupon: Coupon): string =>
  coupon.discountType === 'PERCENTAGE'
    ? `−${Number(coupon.discountValue).toLocaleString('fr-BE')} %`
    : `−${formatPrice(coupon.discountValue)}`

const shortDate = (d: string) =>
  new Date(d).toLocaleDateString('fr-BE', { timeZone: 'Europe/Brussels' })

/** Validity period of a coupon, for the mobile card: "from X to Y", "until Y" or "no end". */
export const periodLabel = (coupon: Coupon, t: Translate): string => {
  if (coupon.validFrom && coupon.validUntil)
    return t('coupons.fromTo', {
      from: shortDate(coupon.validFrom),
      to: shortDate(coupon.validUntil),
    })
  if (coupon.validUntil) return t('coupons.until', { date: shortDate(coupon.validUntil) })
  return t('coupons.noEnd')
}

/** Validity period of a coupon, for the desktop table: "04/10/2026 - 31/10/2026". */
export const formatDateRange = (from: string | null, until: string | null): string => {
  const fmt = shortDate
  if (from && until) return `${fmt(from)} - ${fmt(until)}`
  if (from) return `${fmt(from)} -`
  if (until) return `- ${fmt(until)}`
  return '-'
}
