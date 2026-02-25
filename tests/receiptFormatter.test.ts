import type { Order, OrderProduct } from '~/types'
import {
  buildKitchenTicket,
  buildOrderReceipt,
  createTestOrder,
  formatReceiptDate,
  formatReceiptTime,
} from '~/utils/receiptFormatter'
import { describe, expect, it } from 'vitest'
import { MockPrinter } from '~/utils/mockPrinter'

// --- Helper to build a minimal valid order ---
const makeOrder = (overrides: Partial<Order> = {}): Order => ({
  id: 'abc12345-def',
  createdAt: '2026-02-24T14:30:00.000Z',
  updatedAt: '2026-02-24T14:30:00.000Z',
  status: 'PENDING',
  type: 'PICKUP',
  isOnlinePayment: false,
  discountAmount: '0.00',
  deliveryFee: null,
  totalPrice: '25.00',
  preferredReadyTime: null,
  estimatedReadyTime: null,
  addressExtra: null,
  addressId: null,
  orderNote: null,
  orderExtra: null,
  paymentID: null,
  userId: 'user-1',
  displayCustomerName: 'John Doe',
  displayAddress: '',
  customer: { id: 'c1', firstName: 'John', lastName: 'Doe', phoneNumber: '+32 470 00 00 00' },
  address: null,
  payment: null,
  items: [],
  ...overrides
})

const makeItem = (overrides: Partial<OrderProduct> & { code?: string; name?: string; categoryName?: string; choiceName?: string } = {}): OrderProduct => {
  const { code, name, categoryName, choiceName, ...rest } = overrides
  return {
    unitPrice: '10.00',
    quantity: 1,
    totalPrice: '10.00',
    product: {
      id: 'p1',
      code: code ?? 'E1',
      name: name ?? 'California Roll',
      slug: 'california-roll',
      price: '10.00',
      isAvailable: true,
      isDiscountable: true,
      isHalal: false,
      isVegan: false,
      isVisible: true,
      pieceCount: 8,
      categoryId: 'cat-1',
      category: { id: 'cat-1', name: categoryName ?? 'Makis', order: 1, translations: [] },
      choices: [],
      translations: []
    },
    choice: choiceName ? { id: 'ch1', productId: 'p1', priceModifier: '0.00', sortOrder: 0, name: choiceName, translations: [] } : null,
    ...rest
  }
}

const renderReceipt = (order: Order): string => {
  const mock = new MockPrinter()
  buildOrderReceipt(order)(mock)
  return mock.getOutput()
}

const renderKitchen = (order: Order): string => {
  const mock = new MockPrinter()
  buildKitchenTicket(order)(mock)
  return mock.getOutput()
}

// --- Exported date/time formatters ---

describe('formatReceiptDate', () => {
  it('formats a date string to fr-BE locale', () => {
    const result = formatReceiptDate('2026-02-24T14:30:00.000Z')
    // Should contain day/month/year and time — exact format depends on Node locale data
    expect(result).toMatch(/24/)
    expect(result).toMatch(/02/)
    expect(result).toMatch(/2026/)
  })
})

describe('formatReceiptTime', () => {
  it('returns time string with hours and minutes', () => {
    const result = formatReceiptTime('2026-02-24T14:30:00.000Z')
    // Should contain the hour and minute
    expect(result).toMatch(/\d{2}/)
  })
})

// --- Client Receipt ---

describe('buildOrderReceipt', () => {
  it('prints restaurant name header', () => {
    const output = renderReceipt(makeOrder({ items: [makeItem()] }))
    expect(output).toContain('TOKYO SUSHI BAR')
  })

  it('prints A EMPORTER for pickup orders', () => {
    const output = renderReceipt(makeOrder({ type: 'PICKUP', items: [makeItem()] }))
    expect(output).toContain('A EMPORTER')
  })

  it('prints LIVRAISON for delivery orders', () => {
    const order = makeOrder({
      type: 'DELIVERY',
      address: { id: 'a1', streetName: 'Rue du Test', houseNumber: '42', boxNumber: null, municipalityName: 'Brussels', postcode: '1000', distance: 1.5 },
      deliveryFee: '3.00',
      items: [makeItem()]
    })
    const output = renderReceipt(order)
    expect(output).toContain('LIVRAISON')
  })

  it('includes customer name and phone', () => {
    const output = renderReceipt(makeOrder({
      customer: { id: 'c1', firstName: 'Alice', lastName: 'Dupont', phoneNumber: '+32 470 11 22 33' },
      items: [makeItem()]
    }))
    expect(output).toContain('Client: Alice Dupont')
    expect(output).toContain('Tel: +32 470 11 22 33')
  })

  it('includes delivery address with boxNumber', () => {
    const order = makeOrder({
      type: 'DELIVERY',
      address: { id: 'a1', streetName: 'Rue Haute', houseNumber: '10', boxNumber: '3B', municipalityName: 'Brussels', postcode: '1000', distance: 1 },
      items: [makeItem()]
    })
    const output = renderReceipt(order)
    expect(output).toContain('Rue Haute 10 bte 3B')
    expect(output).toContain('1000 Brussels')
  })

  it('includes addressExtra for delivery', () => {
    const order = makeOrder({
      type: 'DELIVERY',
      addressExtra: 'Code porte: 1234',
      address: { id: 'a1', streetName: 'Rue Haute', houseNumber: '10', boxNumber: null, municipalityName: 'Brussels', postcode: '1000', distance: 1 },
      items: [makeItem()]
    })
    const output = renderReceipt(order)
    expect(output).toContain('Info: Code porte: 1234')
  })

  it('shows "Des que possible" when no preferred time', () => {
    const output = renderReceipt(makeOrder({ preferredReadyTime: null, items: [makeItem()] }))
    expect(output).toContain('Des que possible')
  })

  it('shows preferred ready time when set', () => {
    const output = renderReceipt(makeOrder({
      preferredReadyTime: '2026-02-24T18:00:00.000Z',
      items: [makeItem()]
    }))
    expect(output).toContain('Heure souhaitee:')
    expect(output).not.toContain('Des que possible')
  })

  it('shows online payment status as paid', () => {
    const output = renderReceipt(makeOrder({
      isOnlinePayment: true,
      payment: { id: 'p1', createdAt: '', orderId: '', paidAt: '', status: 'paid', links: {} },
      items: [makeItem()]
    }))
    expect(output).toContain('Paiement en ligne (paye)')
  })

  it('shows cash payment label', () => {
    const output = renderReceipt(makeOrder({
      isOnlinePayment: false,
      payment: { id: 'p1', createdAt: '', orderId: '', paidAt: null, status: 'open', links: {} },
      items: [makeItem()]
    }))
    expect(output).toContain('Paiement en especes')
  })

  it('groups items by category with headers', () => {
    const order = makeOrder({
      items: [
        makeItem({ code: 'E1', categoryName: 'Makis' }),
        makeItem({ code: 'A1', categoryName: 'Entrees' })
      ]
    })
    const output = renderReceipt(order)
    expect(output).toContain('*** MAKIS ***')
    expect(output).toContain('*** ENTREES ***')
  })

  it('sorts items by code within category', () => {
    const order = makeOrder({
      items: [
        makeItem({ code: 'E16', name: 'Second', categoryName: 'Makis' }),
        makeItem({ code: 'E3', name: 'First', categoryName: 'Makis' })
      ]
    })
    const output = renderReceipt(order)
    const e3Pos = output.indexOf('E3')
    const e16Pos = output.indexOf('E16')
    expect(e3Pos).toBeLessThan(e16Pos)
  })

  it('appends choice name to product name', () => {
    const order = makeOrder({
      items: [makeItem({ name: 'Gyoza', choiceName: 'Poulet' })]
    })
    const output = renderReceipt(order)
    expect(output).toContain('Gyoza (Poulet)')
  })

  it('formats item rows with code, quantity, and price', () => {
    const order = makeOrder({
      items: [makeItem({ code: 'E10', quantity: 2, totalPrice: '20.00' })]
    })
    const output = renderReceipt(order)
    expect(output).toContain('E10')
    expect(output).toContain('x2')
    expect(output).toContain('20,00')
  })

  it('shows subtotal computed from items', () => {
    const order = makeOrder({
      totalPrice: '35.00',
      items: [
        makeItem({ totalPrice: '20.00' }),
        makeItem({ totalPrice: '15.00', code: 'E2' })
      ]
    })
    const output = renderReceipt(order)
    expect(output).toContain('Sous-total')
    expect(output).toContain('35,00')
  })

  it('shows delivery fee when present', () => {
    const order = makeOrder({
      type: 'DELIVERY',
      deliveryFee: '3.50',
      address: { id: 'a1', streetName: 'Rue', houseNumber: '1', boxNumber: null, municipalityName: 'City', postcode: '1000', distance: 1 },
      items: [makeItem()]
    })
    const output = renderReceipt(order)
    expect(output).toContain('Frais de livraison')
    expect(output).toContain('3,50')
  })

  it('hides delivery fee when zero', () => {
    const output = renderReceipt(makeOrder({ deliveryFee: '0.00', items: [makeItem()] }))
    expect(output).not.toContain('Frais de livraison')
  })

  it('shows discount when present', () => {
    const output = renderReceipt(makeOrder({ discountAmount: '5.00', items: [makeItem()] }))
    expect(output).toContain('Reduction')
    expect(output).toContain('-5,00')
  })

  it('hides discount when zero', () => {
    const output = renderReceipt(makeOrder({ discountAmount: '0.00', items: [makeItem()] }))
    expect(output).not.toContain('Reduction')
  })

  it('shows grand total', () => {
    const output = renderReceipt(makeOrder({ totalPrice: '42.50', items: [makeItem()] }))
    expect(output).toContain('TOTAL:')
    expect(output).toContain('42,50')
  })

  it('shows order extras with French labels', () => {
    const order = makeOrder({
      orderExtra: [
        { name: 'chopsticks', options: ['4'] },
        { name: 'sauces', options: ['sweet', 'salty'] }
      ],
      items: [makeItem()]
    })
    const output = renderReceipt(order)
    expect(output).toContain('Extras:')
    expect(output).toContain('Baguettes: 4')
    expect(output).toContain('Sauce sucr\u00e9e')
    expect(output).toContain('Sauce sal\u00e9e')
  })

  it('does not show extras section when empty', () => {
    const output = renderReceipt(makeOrder({ orderExtra: null, items: [makeItem()] }))
    expect(output).not.toContain('Extras:')
  })

  it('shows order note', () => {
    const output = renderReceipt(makeOrder({ orderNote: 'Pas de wasabi', items: [makeItem()] }))
    expect(output).toContain('NOTE:')
    expect(output).toContain('Pas de wasabi')
  })

  it('does not show note section when null', () => {
    const output = renderReceipt(makeOrder({ orderNote: null, items: [makeItem()] }))
    expect(output).not.toContain('NOTE:')
  })

  it('ends with thank you message and cut', () => {
    const output = renderReceipt(makeOrder({ items: [makeItem()] }))
    expect(output).toContain('Merci de votre commande!')
    expect(output).toContain('CUT HERE')
  })

  it('does not show address for pickup orders', () => {
    const output = renderReceipt(makeOrder({ type: 'PICKUP', items: [makeItem()] }))
    expect(output).not.toContain('Adresse:')
  })

  it('handles order with no customer gracefully', () => {
    const output = renderReceipt(makeOrder({ customer: null, items: [makeItem()] }))
    expect(output).not.toContain('Client:')
    expect(output).not.toContain('Tel:')
  })

  it('all item row lines are at most 48 chars', () => {
    const order = makeOrder({
      items: [
        makeItem({ code: 'E10', name: 'Very Long Product Name That Might Overflow', quantity: 99, totalPrice: '999.99' })
      ]
    })
    const output = renderReceipt(order)
    const lines = output.split('\n')
    // Find lines that look like item rows (contain a code and x-quantity)
    const itemLines = lines.filter(l => /E10/.test(l) && /x99/.test(l))
    for (const line of itemLines) {
      // Strip mock printer markers like [B] or [2x1]
      const clean = line.replace(/^\[[\w,]+\]\s*/, '')
      expect(clean.length).toBeLessThanOrEqual(48)
    }
  })
})

// --- Kitchen Ticket ---

describe('buildKitchenTicket', () => {
  it('prints CUISINE header', () => {
    const output = renderKitchen(makeOrder({ items: [makeItem()] }))
    expect(output).toContain('*** CUISINE ***')
  })

  it('shows order type prominently', () => {
    const output = renderKitchen(makeOrder({ type: 'DELIVERY', items: [makeItem()] }))
    expect(output).toContain('LIVRAISON')
  })

  it('shows A EMPORTER for pickup', () => {
    const output = renderKitchen(makeOrder({ type: 'PICKUP', items: [makeItem()] }))
    expect(output).toContain('A EMPORTER')
  })

  it('shows truncated order ID', () => {
    const output = renderKitchen(makeOrder({ id: 'abcd1234-long-uuid', items: [makeItem()] }))
    expect(output).toContain('#abcd1234')
  })

  it('groups items by category', () => {
    const order = makeOrder({
      items: [
        makeItem({ code: 'E1', categoryName: 'Makis' }),
        makeItem({ code: 'A1', categoryName: 'Entrees' })
      ]
    })
    const output = renderKitchen(order)
    expect(output).toContain('*** MAKIS ***')
    expect(output).toContain('*** ENTREES ***')
  })

  it('shows item quantity and code', () => {
    const order = makeOrder({
      items: [makeItem({ code: 'E10', name: 'California Roll', quantity: 3 })]
    })
    const output = renderKitchen(order)
    expect(output).toContain('3x')
    expect(output).toContain('E10')
    expect(output).toContain('California Roll')
  })

  it('shows choice in kitchen ticket', () => {
    const order = makeOrder({
      items: [makeItem({ name: 'Gyoza', choiceName: 'Crevettes' })]
    })
    const output = renderKitchen(order)
    expect(output).toContain('Gyoza (Crevettes)')
  })

  it('shows order extras', () => {
    const order = makeOrder({
      orderExtra: [{ name: 'chopsticks', options: ['2'] }],
      items: [makeItem()]
    })
    const output = renderKitchen(order)
    expect(output).toContain('EXTRAS:')
    expect(output).toContain('Baguettes: 2')
  })

  it('shows order note prominently', () => {
    const output = renderKitchen(makeOrder({ orderNote: 'Allergie arachides', items: [makeItem()] }))
    expect(output).toContain('!!! NOTE !!!')
    expect(output).toContain('Allergie arachides')
  })

  it('does not show note section when null', () => {
    const output = renderKitchen(makeOrder({ orderNote: null, items: [makeItem()] }))
    expect(output).not.toContain('!!! NOTE !!!')
  })

  it('ends with a cut', () => {
    const output = renderKitchen(makeOrder({ items: [makeItem()] }))
    expect(output).toContain('CUT HERE')
  })

  it('shows preferred ready time when set', () => {
    const output = renderKitchen(makeOrder({
      preferredReadyTime: '2026-02-24T18:00:00.000Z',
      items: [makeItem()]
    }))
    expect(output).toContain('Souhaitee:')
  })

  it('shows estimated ready time when set', () => {
    const output = renderKitchen(makeOrder({
      estimatedReadyTime: '2026-02-24T18:30:00.000Z',
      items: [makeItem()]
    }))
    expect(output).toContain('Pret:')
  })

  it('does not contain prices (kitchen does not need them)', () => {
    const order = makeOrder({
      items: [makeItem({ totalPrice: '15.50' })]
    })
    const output = renderKitchen(order)
    expect(output).not.toContain('15,50')
    expect(output).not.toContain('TOTAL')
    expect(output).not.toContain('Sous-total')
  })
})

// --- Extra label mapping ---

describe('order extras mapping (via receipt output)', () => {
  it('maps unknown extras with generic format', () => {
    const order = makeOrder({
      orderExtra: [{ name: 'napkins', options: ['extra'] }],
      items: [makeItem()]
    })
    const output = renderReceipt(order)
    expect(output).toContain('napkins: extra')
  })

  it('maps sauce variants in French', () => {
    const order = makeOrder({
      orderExtra: [{ name: 'sauces', options: ['sweet', 'salty'] }],
      items: [makeItem()]
    })
    const output = renderReceipt(order)
    expect(output).toContain('Sauce sucr\u00e9e')
    expect(output).toContain('Sauce sal\u00e9e')
  })

  it('handles already-French sauce names', () => {
    const order = makeOrder({
      orderExtra: [{ name: 'sauces', options: ['sucr\u00e9e', 'sal\u00e9e'] }],
      items: [makeItem()]
    })
    const output = renderReceipt(order)
    expect(output).toContain('Sauce sucr\u00e9e')
    expect(output).toContain('Sauce sal\u00e9e')
  })

  it('handles unknown sauce type with generic label', () => {
    const order = makeOrder({
      orderExtra: [{ name: 'sauces', options: ['teriyaki'] }],
      items: [makeItem()]
    })
    const output = renderReceipt(order)
    expect(output).toContain('Sauce: teriyaki')
  })

  it('ignores extras with null name or options', () => {
    const order = makeOrder({
      orderExtra: [{ name: null, options: null }],
      items: [makeItem()]
    })
    // Should not crash, extras section should not appear since no labels produced
    const output = renderReceipt(order)
    // The Extras: header is still printed but with no content lines following
    expect(output).toContain('Extras:')
  })
})

// --- createTestOrder ---

describe('createTestOrder', () => {
  it('returns a valid order with all required fields', () => {
    const order = createTestOrder()
    expect(order.id).toBeDefined()
    expect(order.type).toBe('DELIVERY')
    expect(order.customer).not.toBeNull()
    expect(order.address).not.toBeNull()
    expect(order.items.length).toBeGreaterThan(0)
  })

  it('uses string prices (not numbers)', () => {
    const order = createTestOrder()
    expect(typeof order.totalPrice).toBe('string')
    expect(typeof order.discountAmount).toBe('string')
    expect(typeof order.items[0].totalPrice).toBe('string')
    expect(typeof order.items[0].unitPrice).toBe('string')
  })

  it('includes order extras for testing', () => {
    const order = createTestOrder()
    expect(order.orderExtra).not.toBeNull()
    expect(order.orderExtra!.length).toBeGreaterThan(0)
  })

  it('includes an item with a choice', () => {
    const order = createTestOrder()
    const itemWithChoice = order.items.find(i => i.choice !== null)
    expect(itemWithChoice).toBeDefined()
    expect(itemWithChoice!.choice!.name).toBeTruthy()
  })

  it('includes items from multiple categories', () => {
    const order = createTestOrder()
    const categoryNames = new Set(order.items.map(i => i.product.category.name))
    expect(categoryNames.size).toBeGreaterThan(1)
  })

  it('renders without errors through both receipt builders', () => {
    const order = createTestOrder()
    expect(() => renderReceipt(order)).not.toThrow()
    expect(() => renderKitchen(order)).not.toThrow()
  })
})
