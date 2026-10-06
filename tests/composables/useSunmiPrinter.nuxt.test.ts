// useSunmiPrinter: the delivery and kitchen receipts printed on the Sunmi V3H (58 mm, 32 characters). The Capacitor
// plugin (the printer) is the boundary: a recorder captures every command, and the receipts are asserted as the exact
// lines the paper would show (prices in EUR with the comma and a no-break space, as on the POS).
// Run: `vp test run tests/composables/useSunmiPrinter.nuxt.test.ts`.
import { type Mock, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import type { Order } from '~/types'
import { setFlags } from '../support/flags'
import { mountComposable } from '../helpers/mountComposable'
import { settle } from '../helpers/settle'
import {
  makeAddress,
  makeCategory,
  makeCustomer,
  makeOrder,
  makeOrderItem,
  makeProduct,
} from '../fixtures/dashboard'

type Call = [method: string, arg?: Record<string, unknown>]

const printer = vi.hoisted(() => {
  const calls: [string, Record<string, unknown>?][] = []
  const record = (method: string) =>
    vi.fn((arg?: Record<string, unknown>) => {
      calls.push(arg === undefined ? [method] : [method, arg])
      return Promise.resolve()
    })
  const plugin = {
    bindService: record('bindService'),
    unbindService: record('unbindService'),
    getStatus: vi.fn(() => Promise.resolve({ status: 1, statusText: 'Ready' })),
    printerInit: record('printerInit'),
    printText: record('printText'),
    setAlignment: record('setAlignment'),
    setFontSize: record('setFontSize'),
    setBold: record('setBold'),
    printColumnsText: record('printColumnsText'),
    lineWrap: record('lineWrap'),
  }
  return { calls, plugin }
})
const platform = vi.hoisted(() => ({ isCapacitor: true }))

vi.mock('~/plugins/capacitor-sunmi-printer/src/index', () => ({ SunmiPrinter: printer.plugin }))
vi.mock('~/composables/usePlatform', () => ({ usePlatform: () => platform }))

const { useSunmiPrinter } = await import('~/composables/useSunmiPrinter')

const NB = ' '
const eur = (amount: string) => `${amount}${NB}€`
const SEP = '-'.repeat(32)
const SEP_THICK = '='.repeat(32)

/** Local wall-clock time as an ISO instant, so the receipt shows the same time in any timezone. */
const at = (day: number, month: number, hour: number, minute: number) =>
  new Date(2026, month - 1, day, hour, minute).toISOString()

/** What the paper shows: text as printed, a row of columns joined with " | ". Formatting commands are dropped. */
function paper(calls: Call[]): string[] {
  const out = calls.flatMap(([method, arg]) => {
    if (method === 'printText') return [String(arg!.text)]
    if (method === 'printColumnsText') {
      const columns = arg!.columns as { text: string }[]
      return [`${columns.map((c) => c.text).join(' | ')}\n`]
    }
    return []
  })
  return out.join('').split('\n').slice(0, -1)
}

const commands = () => printer.calls as Call[]
const printed = () => paper(commands())

/** Mounts the composable (binding the printer as the dashboard does) and forgets the bind calls. */
function mountPrinter() {
  const mounted = mountComposable(() => useSunmiPrinter())
  printer.calls.length = 0
  return mounted
}

const sushi = makeProduct({
  id: 'p-1',
  code: 'S1',
  name: 'Salmon nigiri',
  translations: [{ language: 'fr', name: 'Nigiri saumon', description: null }],
  category: makeCategory({
    id: 'c-1',
    name: 'Sushi',
    translations: [{ language: 'fr', name: 'Sushis', description: null }],
  }),
})
const drink = makeProduct({
  id: 'p-2',
  code: null,
  name: 'Cola',
  translations: [],
  category: makeCategory({ id: 'c-2', name: 'Boissons', translations: [] }),
})

beforeEach(() => {
  vi.resetAllMocks()
  printer.calls.length = 0
  platform.isCapacitor = true
  printer.plugin.getStatus.mockResolvedValue({ status: 1, statusText: 'Ready' })
  for (const [name, fn] of Object.entries(printer.plugin)) {
    if (name === 'getStatus') continue
    ;(fn as Mock<(arg?: Record<string, unknown>) => Promise<void>>).mockImplementation((arg) => {
      printer.calls.push(arg === undefined ? [name] : [name, arg])
      return Promise.resolve()
    })
  }
})

describe('the printer service', () => {
  it('binds when the component is mounted and reads the printer status', async () => {
    const { result } = mountComposable(() => useSunmiPrinter())
    await settle()
    expect(result.isBound.value).toBe(true)
    expect(printer.plugin.bindService).toHaveBeenCalledOnce()
    expect(result.status.value).toBe(1)
    expect(result.statusText.value).toBe('Ready')
  })

  it('unbinds when the component is unmounted, once bound', async () => {
    const { result, unmount } = mountComposable(() => useSunmiPrinter())
    await settle()
    expect(result.isBound.value).toBe(true)
    unmount()
    await settle()
    expect(printer.plugin.unbindService).toHaveBeenCalledOnce()
    expect(result.isBound.value).toBe(false)
  })

  it('does not unbind what was never bound', async () => {
    printer.plugin.bindService.mockReturnValue(new Promise(() => {})) // the bind never completes
    const { result } = mountPrinter()
    expect(result.isBound.value).toBe(false)
    await result.unbind()
    expect(printer.plugin.unbindService).not.toHaveBeenCalled()
  })

  it('refreshStatus re-reads the printer status (paper out, overheating...)', async () => {
    const { result } = mountPrinter()
    printer.plugin.getStatus.mockResolvedValue({ status: 4, statusText: 'Out of paper' })
    await result.refreshStatus()
    expect(result.status.value).toBe(4)
    expect(result.statusText.value).toBe('Out of paper')
  })

  it('stays unbound when the service refuses to bind, and surfaces the error to a direct caller', async () => {
    printer.plugin.bindService.mockReturnValue(new Promise(() => {})) // the bind of the mount never completes
    const { result } = mountPrinter()
    printer.plugin.bindService.mockRejectedValue(new Error('service not found'))
    await expect(result.bind()).rejects.toThrow('service not found')
    expect(result.isBound.value).toBe(false)
  })

  describe('outside the Android app', () => {
    beforeEach(() => {
      platform.isCapacitor = false
    })

    it('is not native and binds nothing', async () => {
      const { result } = mountComposable(() => useSunmiPrinter())
      expect(result.isNative()).toBe(false)
      await result.bind()
      await result.unbind()
      await result.refreshStatus()
      expect(printer.plugin.bindService).not.toHaveBeenCalled()
      expect(printer.plugin.unbindService).not.toHaveBeenCalled()
      expect(printer.plugin.getStatus).not.toHaveBeenCalled()
      expect(result.isBound.value).toBe(false)
    })

    it('skips printing silently, warning only in development', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const { result } = mountComposable(() => useSunmiPrinter())

      await result.printDelivery(makeOrder())
      await result.printKitchen(makeOrder())
      await result.printBoth(makeOrder())
      await result.printReceipt(makeOrder())
      expect(warn).not.toHaveBeenCalled()

      setFlags({ dev: true })
      await result.printDelivery(makeOrder())
      await result.printKitchen(makeOrder())
      expect(warn.mock.calls).toEqual([
        ['[SunmiPrinter] Not on a Sunmi device — delivery print skipped'],
        ['[SunmiPrinter] Not on a Sunmi device — kitchen print skipped'],
      ])
      expect(printer.calls).toEqual([])
    })
  })

  it('is native in the Android app', () => {
    expect(mountPrinter().result.isNative()).toBe(true)
  })
})

const stars = (left: number, label: string, right: number) =>
  `${'*'.repeat(left)}[${label}]${'*'.repeat(right)}`

describe('the delivery receipt', () => {
  const order = (overrides: Partial<Order> = {}) =>
    makeOrder({
      id: 'abcdef01-2345-6789-abcd-ef0123a1b2c3',
      type: 'DELIVERY',
      createdAt: at(28, 3, 14, 30),
      estimatedReadyTime: at(28, 3, 15, 5),
      customer: makeCustomer({
        firstName: 'Ada',
        lastName: 'Lovelace',
        phoneNumber: '+32 470 12 34 56',
      }),
      address: makeAddress({ streetName: 'Rue Saint-Gilles', houseNumber: '12', boxNumber: '3B' }),
      items: [
        makeOrderItem({ quantity: 2, unitPrice: '4.50', totalPrice: '9.00', product: sushi }),
        makeOrderItem({ quantity: 1, unitPrice: '2.50', totalPrice: '2.50', product: drink }),
      ],
      totalPrice: '14.50',
      deliveryFee: '3.00',
      isOnlinePayment: true,
      ...overrides,
    })

  const print = async (o: Order) => {
    const { result } = mountPrinter()
    await result.printDelivery(o)
    return printed()
  }

  it('prints the full receipt: header, customer, address, items by category, totals, payment, footer', async () => {
    expect(await print(order())).toEqual([
      'TEST SUSHI',
      'LIVRAISON',
      '** 1B2C3 **',
      '',
      SEP_THICK,
      'Le: 28/03/2026 14:30',
      'Prêt: 28/03/2026 15:05',
      '',
      SEP,
      'Ada Lovelace',
      '+32 470 12 34 56',
      '',
      SEP,
      'Rue Saint-Gilles 12 bte 3B',
      '4000 Liège',
      '',
      SEP,
      'Qte Article              Prix',
      '',
      stars(12, 'Sushis', 12),
      `2x | S1. Nigiri saumon | ${eur('9,00')}`,
      '',
      stars(11, 'Boissons', 11),
      `1x | Cola | ${eur('2,50')}`,
      '',
      SEP,
      `Sous-total | ${eur('11,50')}`,
      `Livraison | ${eur('3,00')}`,
      `TOTAL | ${eur('14,50')}`,
      '',
      SEP,
      'EN LIGNE — PAYÉ',
      '',
      SEP_THICK,
      'Merci pour votre commande',
    ])
  })

  it('formats the printer: initialised first, bold and alignment always put back, 4 blank lines at the end', async () => {
    await print(order())
    const all = commands()
    expect(all[0]).toEqual(['printerInit'])
    expect(all.slice(1, 8)).toEqual([
      ['setAlignment', { alignment: 'center' }],
      ['setBold', { enabled: true }],
      ['setFontSize', { size: 28 }],
      ['printText', { text: 'TEST SUSHI\n' }],
      ['setFontSize', { size: 24 }],
      ['printText', { text: 'LIVRAISON\n' }],
      ['printText', { text: '** 1B2C3 **\n' }],
    ])
    expect(all.at(-1)).toEqual(['lineWrap', { lines: 4 }])
    const bold = all.filter(([m]) => m === 'setBold').map(([, a]) => a!.enabled)
    expect(bold.at(-1)).toBe(false)
    expect(bold.filter(Boolean)).toHaveLength(bold.filter((b) => !b).length)
    const alignments = all.filter(([m]) => m === 'setAlignment').map(([, a]) => a!.alignment)
    expect(alignments.at(-1)).toBe('left')
  })

  it('lays the item rows out as 3 + 18 + 9 characters (qty, name left; price right) and the totals as 21 + 9', async () => {
    await print(order())
    const rows = commands()
      .filter(([m]) => m === 'printColumnsText')
      .map(([, a]) =>
        (a!.columns as { width: number; align: string }[]).map((c) => [c.width, c.align]),
      )
    expect(rows[0]).toEqual([
      [3, 'left'],
      [18, 'left'],
      [9, 'right'],
    ])
    for (const total of rows.slice(2)) {
      expect(total).toEqual([
        [21, 'left'],
        [9, 'right'],
      ])
    }
    expect(rows.every((row) => row.reduce((sum, [width]) => sum + Number(width), 0) <= 32)).toBe(
      true,
    )
  })

  it('shows a pick-up order as "À EMPORTER" and prints no delivery fee', async () => {
    const lines = await print(order({ type: 'PICKUP', deliveryFee: null, totalPrice: '11.50' }))
    expect(lines[1]).toBe('À EMPORTER')
    expect(lines.some((l) => l.startsWith('Livraison'))).toBe(false)
    expect(lines).toContain(`TOTAL | ${eur('11,50')}`)
  })

  describe('the ready time', () => {
    it('is the estimate when there is one, even if the customer asked for another time', async () => {
      const lines = await print(
        order({ estimatedReadyTime: at(28, 3, 15, 5), preferredReadyTime: at(28, 3, 19, 0) }),
      )
      expect(lines).toContain('Prêt: 28/03/2026 15:05')
    })

    it('is the time the customer asked for when there is no estimate yet', async () => {
      const lines = await print(
        order({ estimatedReadyTime: null, preferredReadyTime: at(28, 3, 19, 0) }),
      )
      expect(lines).toContain('Prêt: 28/03/2026 19:00')
    })

    it('is ASAP when neither is set', async () => {
      const lines = await print(order({ estimatedReadyTime: null, preferredReadyTime: null }))
      expect(lines).toContain('Prêt: ASAP')
    })

    it('zero-pads day, month and minutes', async () => {
      const lines = await print(order({ createdAt: at(5, 1, 9, 7) }))
      expect(lines).toContain('Le: 05/01/2026 09:07')
    })
  })

  describe('the customer block', () => {
    it('leaves out the phone when there is none', async () => {
      const lines = await print(order({ customer: makeCustomer({ phoneNumber: null }) }))
      expect(lines).toContain('Ada Lovelace')
      expect(lines.some((l) => l.includes('+32'))).toBe(false)
    })

    it('is absent for an order without a customer (guest at the counter)', async () => {
      const lines = await print(order({ customer: null, address: null }))
      const from = lines.indexOf('Prêt: 28/03/2026 15:05')
      expect(lines.slice(from + 1, from + 4)).toEqual(['', SEP, 'Qte Article              Prix'])
    })
  })

  describe('the address block', () => {
    it('writes street and number, then postcode and municipality, without a box', async () => {
      const lines = await print(order({ address: makeAddress({ boxNumber: null }) }))
      expect(lines).toContain('Rue Saint-Gilles 12')
      expect(lines).toContain('4000 Liège')
    })

    it('uses the free-text address of a manual order when there is no structured one', async () => {
      const lines = await print(
        order({ address: null, displayAddress: 'Chaussée de Tongres 5, 4000 Liège' }),
      )
      expect(lines).toContain('Chaussée de Tongres 5, 4000 Liège')
      expect(lines).not.toContain('4000 Liège')
    })

    it('prefers the structured address over the display one', async () => {
      const lines = await print(order({ displayAddress: 'ignored, 1000 Bruxelles' }))
      expect(lines.some((l) => l.includes('ignored'))).toBe(false)
    })

    it('adds the delivery instructions in parentheses', async () => {
      const lines = await print(order({ addressExtra: 'Sonnette 2, code 1234' }))
      expect(lines).toContain('(Sonnette 2, code 1234)')
    })

    it('prints no address section for a pick-up order without one', async () => {
      const lines = await print(order({ type: 'PICKUP', address: null, displayAddress: '' }))
      expect(lines.some((l) => l.includes('Liège'))).toBe(false)
    })
  })

  describe('the items', () => {
    it('groups by category in order of first appearance, even when the items are not adjacent', async () => {
      const lines = await print(
        order({
          items: [
            makeOrderItem({ totalPrice: '1.00', product: sushi }),
            makeOrderItem({ totalPrice: '2.00', product: drink }),
            makeOrderItem({
              totalPrice: '3.00',
              product: makeProduct({
                ...sushi,
                id: 'p-3',
                code: 'S2',
                name: 'Tuna',
                translations: [],
              }),
            }),
          ],
        }),
      )
      const body = lines.slice(
        lines.indexOf(stars(12, 'Sushis', 12)),
        lines.indexOf(`Sous-total | ${eur('6,00')}`),
      )
      expect(body).toEqual([
        stars(12, 'Sushis', 12),
        `1x | S1. Nigiri saumon | ${eur('1,00')}`,
        `1x | S2. Tuna | ${eur('3,00')}`,
        '',
        stars(11, 'Boissons', 11),
        `1x | Cola | ${eur('2,00')}`,
        '',
        SEP,
      ])
    })

    it('files products without a category under "Autres"', async () => {
      const lines = await print(
        order({ items: [makeOrderItem({ product: { ...drink, category: null } as never })] }),
      )
      expect(lines).toContain(stars(12, 'Autres', 12))
    })

    it('shows the French name, trimmed; a blank or missing French translation falls back to the default name', async () => {
      const lines = await print(
        order({
          items: [
            makeOrderItem({
              product: makeProduct({
                name: 'Padded',
                translations: [{ language: 'fr', name: '  Rembourré  ', description: null }],
                category: makeCategory({
                  name: 'Blank',
                  translations: [{ language: 'fr', name: '   ', description: null }],
                }),
              }),
            }),
            makeOrderItem({
              product: makeProduct({
                name: 'English only',
                translations: [{ language: 'en', name: 'English only (en)', description: null }],
                category: makeCategory({
                  name: 'Blank',
                  translations: [{ language: 'fr', name: '   ', description: null }],
                }),
              }),
            }),
          ],
        }),
      )
      expect(lines).toContain(stars(12, 'Blank', 13))
      expect(lines).toContain(`1x | Rembourré | ${eur('10,00')}`)
      expect(lines).toContain(`1x | English only | ${eur('10,00')}`)
    })

    it('appends the chosen option in parentheses, after the product code', async () => {
      const lines = await print(
        order({
          items: [
            makeOrderItem({
              quantity: 3,
              totalPrice: '30.00',
              product: sushi,
              choice: { id: 'ch-1', name: 'Wasabi' } as never,
            }),
          ],
        }),
      )
      expect(lines).toContain(`3x | S1. Nigiri saumon (Wasabi) | ${eur('30,00')}`)
    })

    it('does not pad a category name longer than the paper (no stars, no truncation)', async () => {
      const long = 'Spécialités de la maison du chef'
      const lines = await print(
        order({
          items: [
            makeOrderItem({ product: makeProduct({ category: makeCategory({ name: long }) }) }),
          ],
        }),
      )
      expect(lines).toContain(`[${long}]`)
    })
  })

  describe('the totals', () => {
    it('adds the item totals for the sub-total, whatever the order total says', async () => {
      const lines = await print(
        order({
          items: [makeOrderItem({ totalPrice: '0.10' }), makeOrderItem({ totalPrice: '0.20' })],
          deliveryFee: null,
          totalPrice: '9.99',
        }),
      )
      // 0.1 + 0.2 is 0.30000000000000004 in floating point: the paper must say 0,30.
      expect(lines).toContain(`Sous-total | ${eur('0,30')}`)
      expect(lines).toContain(`TOTAL | ${eur('9,99')}`)
    })

    it('shows a discount as a negative amount, only when it is more than zero', async () => {
      expect(await print(order({ discountAmount: '2.50' }))).toContain(
        `Réduction | -${eur('2,50')}`,
      )
      for (const none of ['0.00', '0', '']) {
        const lines = await print(order({ discountAmount: none }))
        expect(lines.some((l) => l.startsWith('Réduction'))).toBe(false)
      }
    })

    it('places the discount between the sub-total and the delivery fee', async () => {
      const lines = await print(order({ discountAmount: '1.00' }))
      const from = lines.findIndex((l) => l.startsWith('Sous-total'))
      expect(lines.slice(from, from + 4).map((l) => l.split(' | ')[0])).toEqual([
        'Sous-total',
        'Réduction',
        'Livraison',
        'TOTAL',
      ])
    })

    it('sums the item lines in cents: no float drift in the subtotal', async () => {
      const lines = await print(
        order({
          items: [
            makeOrderItem({ product: sushi, totalPrice: '0.10' }),
            makeOrderItem({ product: sushi, totalPrice: '0.20' }),
          ],
          totalPrice: '0.30',
        }),
      )
      // 0.1 + 0.2 = 0.30000000000000004 as floats.
      expect(lines).toContain(`Sous-total | ${eur('0,30')}`)
    })

    it('rounds a third decimal half up, like the integer-cents maths of the POS', async () => {
      const lines = await print(order({ totalPrice: '20.505' }))
      expect(lines).toContain(`TOTAL | ${eur('20,51')}`)
    })

    it('reads a comma decimal like the point one', async () => {
      const lines = await print(order({ totalPrice: '12,50' }))
      expect(lines).toContain(`TOTAL | ${eur('12,50')}`)
    })

    describe('an amount that is not a number', () => {
      const log = () => vi.spyOn(console, 'error').mockImplementation(() => {})

      it.each([
        ['text', 'abc'],
        ['an empty string', ''],
        ['a thousands separator', '1,234.56'],
        ['NaN', NaN],
      ])('prints --,-- €, never "NaN €", and logs it (%s)', async (_name, bad) => {
        const logged = log()
        const lines = await print(order({ totalPrice: bad as string }))
        expect(lines).toContain(`TOTAL | ${eur('--,--')}`)
        expect(lines.some((l) => l.includes('NaN'))).toBe(false)
        expect(logged).toHaveBeenCalledWith('[SunmiPrinter] Unreadable price on a receipt:', bad)
      })

      it('prints an unreadable item price as --,-- and makes the subtotal unknown, not a partial sum', async () => {
        log()
        const lines = await print(
          order({
            items: [
              makeOrderItem({ product: sushi, totalPrice: '4.00' }),
              makeOrderItem({ product: sushi, totalPrice: 'oops' }),
            ],
          }),
        )
        expect(lines).toContain(`Sous-total | ${eur('--,--')}`)
        // The item line and the subtotal are unknown; the total (a field of its own) is still printed.
        expect(lines.filter((l) => l.includes('--,--'))).toHaveLength(2)
        expect(lines).toContain(`TOTAL | ${eur('14,50')}`)
      })

      it('does not print a discount or a fee it cannot read', async () => {
        log()
        const lines = await print(order({ discountAmount: 'n/a', deliveryFee: 'n/a' }))
        expect(lines.some((l) => l.startsWith('Réduction') || l.startsWith('Livraison'))).toBe(
          false,
        )
      })
    })

    it('omits the delivery fee when it is null, empty or zero', async () => {
      for (const fee of [null, '', '0.00']) {
        const lines = await print(order({ deliveryFee: fee }))
        expect(lines.some((l) => l.startsWith('Livraison'))).toBe(false)
      }
    })

    it('writes amounts with two decimals and a comma, no thousands separator', async () => {
      const lines = await print(order({ totalPrice: '1234.5', deliveryFee: '0.5' }))
      expect(lines).toContain(`TOTAL | ${eur('1234,50')}`)
      expect(lines).toContain(`Livraison | ${eur('0,50')}`)
    })

    it('puts a no-break space before the euro sign so the amount never wraps', async () => {
      await print(order({ totalPrice: '14.50' }))
      const total = commands().find(
        ([m, a]) =>
          m === 'printColumnsText' && (a!.columns as { text: string }[])[0]!.text === 'TOTAL',
      )
      expect((total![1]!.columns as { text: string }[])[1]!.text).toBe('14,50 €')
    })

    it('prints TOTAL in bold', async () => {
      await print(order())
      const names = commands().map(([m, a]) => (m === 'setBold' ? `bold:${String(a!.enabled)}` : m))
      const total = commands().findIndex(
        ([m, a]) =>
          m === 'printColumnsText' && (a!.columns as { text: string }[])[0]!.text === 'TOTAL',
      )
      expect(names[total - 1]).toBe('bold:true')
      expect(names[total + 1]).toBe('bold:false')
    })
  })

  describe('the payment banner', () => {
    it('says the order is paid online', async () => {
      expect(await print(order({ isOnlinePayment: true }))).toContain('EN LIGNE — PAYÉ')
    })

    it('says cash for an order to pay on the spot', async () => {
      const lines = await print(order({ isOnlinePayment: false }))
      expect(lines).toContain('ESPÈCES')
      expect(lines).not.toContain('EN LIGNE — PAYÉ')
    })
  })

  describe('extras and notes', () => {
    it('lists the named extras with their options, skipping the nameless ones', async () => {
      const lines = await print(
        order({
          orderExtra: [
            { name: 'Baguettes', options: ['2'] },
            { name: 'Sauce', options: ['Soja', 'Wasabi'] },
            { name: null, options: ['ignored'] },
            { name: 'Sans options', options: [] },
            { name: 'Null options', options: null },
          ],
        }),
      )
      const from = lines.indexOf('EN LIGNE — PAYÉ')
      expect(lines.slice(from + 1, from + 8)).toEqual([
        '',
        SEP,
        '+ Baguettes: 2',
        '+ Sauce: Soja, Wasabi',
        '+ Sans options',
        '+ Null options',
        '',
      ])
    })

    it('prints no extras section for an empty list', async () => {
      const withEmpty = await print(order({ orderExtra: [] }))
      expect(withEmpty).toEqual(await print(order({ orderExtra: null })))
      expect(withEmpty.some((l) => l.startsWith('+ '))).toBe(false)
    })

    it('prints the order note', async () => {
      const lines = await print(order({ orderNote: 'Sans gluten, merci' }))
      const from = lines.indexOf('Note: Sans gluten, merci')
      expect(lines.slice(from - 2, from + 1)).toEqual(['', SEP, 'Note: Sans gluten, merci'])
    })

    it('prints extras before the note', async () => {
      const lines = await print(
        order({ orderExtra: [{ name: 'Baguettes', options: null }], orderNote: 'Note' }),
      )
      expect(lines.indexOf('+ Baguettes')).toBeLessThan(lines.indexOf('Note: Note'))
    })
  })

  describe('when the printer fails', () => {
    it('rejects at the first command, printing nothing', async () => {
      const { result } = mountPrinter()
      printer.plugin.printerInit.mockRejectedValue(new Error('printer offline'))
      await expect(result.printDelivery(order())).rejects.toThrow('printer offline')
      expect(printer.calls).toEqual([])
    })

    it('stops at the failing command (no half receipt followed by more output)', async () => {
      const { result } = mountPrinter()
      printer.plugin.printText.mockRejectedValueOnce(new Error('out of paper'))
      await expect(result.printDelivery(order())).rejects.toThrow('out of paper')
      expect(printer.calls.some(([m]) => m === 'lineWrap')).toBe(false)
      expect(printer.calls.some(([m]) => m === 'printColumnsText')).toBe(false)
    })
  })
})

describe('the kitchen receipt', () => {
  const order = (overrides: Partial<Order> = {}) =>
    makeOrder({
      id: 'abcdef01-2345-6789-abcd-ef0123a1b2c3',
      type: 'PICKUP',
      createdAt: at(28, 3, 14, 30),
      estimatedReadyTime: null,
      preferredReadyTime: at(28, 3, 15, 0),
      customer: makeCustomer({
        firstName: 'Ada',
        lastName: 'Lovelace',
        phoneNumber: '+32 470 12 34 56',
      }),
      items: [
        makeOrderItem({ quantity: 2, unitPrice: '4.50', totalPrice: '9.00', product: sushi }),
        makeOrderItem({
          quantity: 1,
          totalPrice: '2.50',
          product: drink,
          choice: { id: 'ch-1', name: 'Zéro' } as never,
        }),
      ],
      ...overrides,
    })

  const print = async (o: Order) => {
    const { result } = mountPrinter()
    await result.printKitchen(o)
    return printed()
  }

  it('prints the kitchen copy: what to prepare and for when, with no prices, address or payment', async () => {
    expect(
      await print(
        order({ orderExtra: [{ name: 'Baguettes', options: ['2'] }], orderNote: 'Sans gluten' }),
      ),
    ).toEqual([
      'CUISINE',
      'À EMPORTER',
      '** 1B2C3 **',
      '',
      SEP_THICK,
      'Le: 28/03/2026 14:30',
      'Prêt: 28/03/2026 15:00',
      'Ada Lovelace',
      '+32 470 12 34 56',
      '',
      SEP,
      'Qte Article',
      '',
      stars(12, 'Sushis', 12),
      '2x S1. Nigiri saumon',
      '',
      stars(11, 'Boissons', 11),
      '1x Cola (Zéro)',
      '',
      SEP,
      '+ Baguettes: 2',
      '',
      SEP,
      'Note: Sans gluten',
      '',
      SEP_THICK,
    ])
  })

  it('prints each item in bold, large (28), then restores the normal size', async () => {
    await print(order())
    const all = commands()
    const at2x = all.findIndex(
      ([m, a]) => m === 'printText' && a!.text === '2x S1. Nigiri saumon\n',
    )
    expect(all.slice(at2x - 2, at2x + 3)).toEqual([
      ['setBold', { enabled: true }],
      ['setFontSize', { size: 28 }],
      ['printText', { text: '2x S1. Nigiri saumon\n' }],
      ['setFontSize', { size: 24 }],
      ['setBold', { enabled: false }],
    ])
  })

  it('has a large CUISINE header, initialises first and ends with 4 blank lines', async () => {
    await print(order())
    const all = commands()
    expect(all[0]).toEqual(['printerInit'])
    expect(all.slice(1, 5)).toEqual([
      ['setAlignment', { alignment: 'center' }],
      ['setBold', { enabled: true }],
      ['setFontSize', { size: 32 }],
      ['printText', { text: 'CUISINE\n' }],
    ])
    expect(all.at(-1)).toEqual(['lineWrap', { lines: 4 }])
    expect(all.some(([m]) => m === 'printColumnsText')).toBe(false)
  })

  it('shows a delivery as LIVRAISON and ASAP when no time was set', async () => {
    const lines = await print(order({ type: 'DELIVERY', preferredReadyTime: null }))
    expect(lines[1]).toBe('LIVRAISON')
    expect(lines).toContain('Prêt: ASAP')
  })

  it('uses the estimate over the preferred time, like the delivery copy', async () => {
    const lines = await print(order({ estimatedReadyTime: at(28, 3, 16, 45) }))
    expect(lines).toContain('Prêt: 28/03/2026 16:45')
  })

  it('leaves out the customer, the phone, the extras and the note when absent', async () => {
    const lines = await print(order({ customer: null }))
    for (const gone of ['Ada Lovelace', '+32 470 12 34 56', 'Note: Sans gluten']) {
      expect(lines).not.toContain(gone)
    }
    const noPhone = await print(order({ customer: makeCustomer({ phoneNumber: null }) }))
    expect(noPhone).toContain('Ada Lovelace')
    expect(noPhone.some((l) => l.includes('+32'))).toBe(false)
    expect(lines.some((l) => l.startsWith('+ ') || l.startsWith('Note:'))).toBe(false)
  })

  it('skips nameless extras', async () => {
    const lines = await print(
      order({
        orderExtra: [
          { name: null, options: ['x'] },
          { name: 'Sauce', options: ['Soja', 'Wasabi'] },
          { name: 'Bare', options: [] },
          { name: 'Plain', options: null },
        ],
      }),
    )
    expect(lines.filter((l) => l.startsWith('+ '))).toEqual([
      '+ Sauce: Soja, Wasabi',
      '+ Bare',
      '+ Plain',
    ])
  })

  it('files uncategorised products under "Autres"', async () => {
    const lines = await print(
      order({ items: [makeOrderItem({ product: { ...drink, category: null } as never })] }),
    )
    expect(lines).toContain(stars(12, 'Autres', 12))
  })

  it('rejects when the printer fails, printing nothing more', async () => {
    const { result } = mountPrinter()
    printer.plugin.setBold.mockRejectedValueOnce(new Error('printer offline'))
    await expect(result.printKitchen(order())).rejects.toThrow('printer offline')
    expect(printer.calls.some(([m]) => m === 'lineWrap')).toBe(false)
  })
})

describe('printBoth and printReceipt', () => {
  const order = () =>
    makeOrder({
      id: 'abcdef01-2345-6789-abcd-ef0123a1b2c3',
      createdAt: at(28, 3, 14, 30),
      customer: makeCustomer(),
    })

  it('prints the kitchen copy, then the delivery copy', async () => {
    const { result } = mountPrinter()
    await result.printBoth(order())
    const lines = printed()
    expect(lines.indexOf('CUISINE')).toBeGreaterThanOrEqual(0)
    expect(lines.indexOf('CUISINE')).toBeLessThan(lines.indexOf('TEST SUSHI'))
    expect(printer.calls.filter(([m]) => m === 'printerInit')).toHaveLength(2)
    expect(printer.calls.filter(([m]) => m === 'lineWrap')).toHaveLength(2)
  })

  it('does not print the delivery copy when the kitchen copy fails', async () => {
    const { result } = mountPrinter()
    printer.plugin.printerInit.mockRejectedValueOnce(new Error('printer offline'))
    await expect(result.printBoth(order())).rejects.toThrow('printer offline')
    expect(printer.calls).toEqual([])
  })

  it('printReceipt prints the delivery copy', async () => {
    const { result } = mountPrinter()
    await result.printReceipt(order())
    expect(printed()[0]).toBe('TEST SUSHI')
    expect(printed()).not.toContain('CUISINE')
  })
})
