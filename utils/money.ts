/*
 * Money is handled as integer cents. The API sends prices as decimal strings ("12.50"); summing them as floats drifts
 * (0.1 + 0.2), so every amount is converted to cents first and only formatted at the edge.
 */

/**
 * Converts a decimal price ("12.5", "12.50", 12.5, "-3") to integer cents. Strings are parsed digit by digit (no float
 * maths), a third decimal rounds half up. Returns null for anything that is not a plain decimal number.
 */
export function parseCents(value: string | number | null | undefined): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? Math.round(value * 100) : null
  if (typeof value !== 'string') return null
  const match = /^\s*([+-])?(\d+)?(?:\.(\d+))?\s*$/.exec(value)
  if (!match || (match[2] === undefined && match[3] === undefined)) return null
  const fraction = (match[3] ?? '').padEnd(3, '0')
  let cents = Number(match[2] ?? '0') * 100 + Number(fraction.slice(0, 2))
  if (Number(fraction[2]) >= 5) cents += 1
  return match[1] === '-' ? -cents : cents
}

/** Like {@link parseCents}, but an invalid or missing amount counts as 0 (for sums and "is there a discount?" checks). */
export function toCents(value: string | number | null | undefined): number {
  return parseCents(value) ?? 0
}

/** Integer cents as a number of euros, for the locale formatters (`formatPrice`): 1250 -> 12.5. */
export function centsToEuros(cents: number): number {
  return cents / 100
}

/** Integer cents as the receipt price, same format as the POS: 2050 -> "20,50 €" (comma, non-breaking space). */
export function formatCentsReceipt(cents: number): string {
  const abs = Math.abs(cents)
  const whole = Math.floor(abs / 100)
  const fraction = String(abs % 100).padStart(2, '0')
  return `${cents < 0 ? '-' : ''}${whole},${fraction} €`
}
