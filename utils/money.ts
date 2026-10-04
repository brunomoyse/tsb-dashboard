/*
 * Money is handled as integer cents. The API sends prices as decimal strings ("12.50"); summing them as floats drifts
 * (0.1 + 0.2), so every amount is converted to cents first and only formatted at the edge.
 */

/**
 * Converts a decimal price ("12.5", "12.50", "12,50", "5.", 12.5, "-3") to integer cents. Strings are parsed digit by
 * digit (no float maths); a third decimal rounds half away from zero. A number is read through its shortest decimal
 * representation (`String(1.005)` is "1.005", not 100.49999999999999 cents), so it rounds like the same string would.
 * The comma is accepted as the decimal separator (the French / Belgian way), thousands separators and exponents are
 * not. Returns null for anything that is not a plain decimal number.
 */
export function parseCents(value: string | number | null | undefined): number | null {
  if (typeof value === 'number')
    return Number.isFinite(value) ? parseCents(numberToDecimal(value)) : null
  if (typeof value !== 'string') return null
  const match = /^\s*([+-])?(\d+)?(?:[.,](\d*))?\s*$/u.exec(value)
  if (!match || (!match[2] && !match[3])) return null
  const fraction = (match[3] ?? '').padEnd(3, '0')
  let cents = Number(match[2] ?? '0') * 100 + Number(fraction.slice(0, 2))
  if (Number(fraction[2]) >= 5) cents += 1
  return match[1] === '-' && cents > 0 ? -cents : cents
}

/** The plain decimal text of a finite number: `String()` writes 1e-7 / 1e21 with an exponent, which `parseCents` refuses. */
function numberToDecimal(value: number): string {
  const text = String(value)
  if (!text.includes('e')) return text
  // Below a hundredth of a cent it rounds to 0; above 1e21 euros cents are no longer exact integers: not an amount.
  return Math.abs(value) < 1 ? '0' : 'NaN'
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

/** The sum of amounts in integer cents, or null when any of them is not a readable amount (a partial sum would be wrong). */
export function sumCents(values: (string | number | null | undefined)[]): number | null {
  let sum = 0
  for (const value of values) {
    const cents = parseCents(value)
    if (cents === null) return null
    sum += cents
  }
  return sum
}
