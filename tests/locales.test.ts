// Every dashboard locale has the same keys: copy added in one language and forgotten in another would show a raw key.
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vite-plus/test'

const dir = resolve(import.meta.dirname, '../locales')
const load = (file: string) => JSON.parse(readFileSync(resolve(dir, file), 'utf8')) as object

const flatten = (value: unknown, prefix = ''): string[] =>
  typeof value === 'object' && value !== null
    ? Object.entries(value).flatMap(([key, child]) =>
        flatten(child, prefix ? `${prefix}.${key}` : key),
      )
    : [prefix]

const files = readdirSync(dir).filter((f) => f.endsWith('.json'))

describe('locales', () => {
  it('has fr, en, nl and zh', () => {
    expect(files.sort()).toEqual(['en.json', 'fr.json', 'nl.json', 'zh.json'])
  })

  it.each(files)('%s has exactly the keys of fr.json', (file) => {
    const reference = new Set(flatten(load('fr.json')))
    const keys = new Set(flatten(load(file)))
    expect([...reference].filter((k) => !keys.has(k))).toEqual([])
    expect([...keys].filter((k) => !reference.has(k))).toEqual([])
  })

  it.each(files)('%s has a message for every way an order update can fail', (file) => {
    const { orders } = load(file) as { orders: { errors: Record<string, string> } }
    for (const key of [
      'updateFailed',
      'paymentSettlementFailed',
      'paymentNotRefundable',
      'refundedNotReopenable',
    ]) {
      expect(orders.errors[key], `${file} orders.errors.${key}`).toMatch(/\S/u)
    }
  })
})
