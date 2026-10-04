// Integer-cents helpers: the API sends decimal strings, sums must not drift and receipts must never print "NaN €".
import { describe, expect, it } from 'vite-plus/test'
import { centsToEuros, formatCentsReceipt, parseCents, toCents } from '~/utils/money'

describe('parseCents', () => {
  it.each([
    ['12.50', 1250],
    ['12.5', 1250],
    ['12', 1200],
    ['0.00', 0],
    ['0.07', 7],
    ['.5', 50],
    [' 19.99 ', 1999],
    ['+3.10', 310],
    ['-3.10', -310],
    ['-0.01', -1],
    ['0.005', 1],
    ['0.004', 0],
    ['1.999', 200],
    ['1234567.89', 123456789],
  ])('reads %s as %d cents', (input, cents) => {
    expect(parseCents(input)).toBe(cents)
  })

  it('reads numbers as euros', () => {
    expect(parseCents(20.5)).toBe(2050)
    expect(parseCents(0.1 + 0.2)).toBe(30)
    expect(parseCents(-4)).toBe(-400)
  })

  it.each(['', ' ', 'abc', '12,50', '1.2.3', '5.', '12.5€', '.', '+', '1e3', 'NaN', 'Infinity'])(
    'rejects the string %j',
    (input) => {
      expect(parseCents(input)).toBeNull()
    },
  )

  it.each([NaN, Infinity, -Infinity, null, undefined])('rejects %s', (input) => {
    expect(parseCents(input as number)).toBeNull()
  })
})

describe('toCents', () => {
  it('is the value in cents, or 0 when it is not an amount', () => {
    expect(toCents('7.25')).toBe(725)
    expect(toCents(null)).toBe(0)
    expect(toCents(undefined)).toBe(0)
    expect(toCents('n/a')).toBe(0)
  })

  it('sums without the float drift of the decimal strings', () => {
    const lines = ['0.10', '0.20']
    const floatSum = lines.reduce((acc, l) => acc + parseFloat(l), 0)
    expect(floatSum).not.toBe(0.3) // 0.30000000000000004
    expect(lines.reduce((acc, l) => acc + toCents(l), 0)).toBe(30)
  })
})

describe('centsToEuros', () => {
  it('turns cents into the euro amount the formatters take', () => {
    expect(centsToEuros(1250)).toBe(12.5)
    expect(centsToEuros(0)).toBe(0)
    expect(centsToEuros(-5)).toBe(-0.05)
  })
})

describe('formatCentsReceipt', () => {
  it('prints comma decimals and a non-breaking space before the euro sign', () => {
    expect(formatCentsReceipt(2050)).toBe('20,50 €')
    expect(formatCentsReceipt(0)).toBe('0,00 €')
    expect(formatCentsReceipt(5)).toBe('0,05 €')
    expect(formatCentsReceipt(123456)).toBe('1234,56 €')
  })

  it('keeps the sign of a negative amount', () => {
    expect(formatCentsReceipt(-250)).toBe('-2,50 €')
  })
})
