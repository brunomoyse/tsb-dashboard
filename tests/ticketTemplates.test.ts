import { describe, expect, it } from 'vitest'
import {
  DEFAULT_TEMPLATES,
  createTestOrder,
  generateDeliveryPreview,
  generateKitchenPreview,
} from '~/utils/ticketTemplates'
import type { TicketTemplates } from '~/types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SEP = '-'.repeat(32)
const SEP_THICK = '='.repeat(32)

function cloneTemplates(src: TicketTemplates): TicketTemplates {
  return JSON.parse(JSON.stringify(src))
}

// ─── DEFAULT_TEMPLATES ────────────────────────────────────────────────────────

describe('DEFAULT_TEMPLATES', () => {
  it('has all 8 delivery sections enabled', () => {
    const { delivery } = DEFAULT_TEMPLATES
    expect(delivery.sectionOrder).toHaveLength(8)
    for (const key of delivery.sectionOrder) {
      expect(delivery.sections[key]?.enabled).toBe(true)
    }
  })

  it('has all 5 kitchen sections enabled', () => {
    const { kitchen } = DEFAULT_TEMPLATES
    expect(kitchen.sectionOrder).toHaveLength(5)
    for (const key of kitchen.sectionOrder) {
      expect(kitchen.sections[key]?.enabled).toBe(true)
    }
  })

  it('delivery header has restaurant name', () => {
    expect(DEFAULT_TEMPLATES.delivery.sections.header.restaurantName).toBe('TOKYO SUSHI BAR')
  })

  it('kitchen header has title', () => {
    expect(DEFAULT_TEMPLATES.kitchen.sections.header.title).toBe('CUISINE')
  })
})

// ─── createTestOrder ─────────────────────────────────────────────────────────

describe('createTestOrder', () => {
  it('returns a DELIVERY order', () => {
    const order = createTestOrder()
    expect(order.type).toBe('DELIVERY')
  })

  it('has 2 items', () => {
    const order = createTestOrder()
    expect(order.items).toHaveLength(2)
  })

  it('has a valid customer', () => {
    const order = createTestOrder()
    expect(order.customer?.firstName).toBe('Marie')
    expect(order.customer?.lastName).toBe('Martin')
  })

  it('has a structured address', () => {
    const order = createTestOrder()
    expect(order.address?.streetName).toBe('Rue de la Paix')
    expect(order.address?.postcode).toBe('4000')
  })

  it('has a delivery fee and a total price', () => {
    const order = createTestOrder()
    expect(parseFloat(order.deliveryFee ?? '0')).toBeGreaterThan(0)
    expect(parseFloat(order.totalPrice)).toBeGreaterThan(0)
  })
})

// ─── generateDeliveryPreview ─────────────────────────────────────────────────

describe('generateDeliveryPreview', () => {
  it('always ends with the thick separator', () => {
    const order = createTestOrder()
    const text = generateDeliveryPreview(order, DEFAULT_TEMPLATES)
    expect(text.trimEnd().endsWith(SEP_THICK)).toBe(true)
  })

  it('contains the restaurant name from the template', () => {
    const order = createTestOrder()
    const text = generateDeliveryPreview(order, DEFAULT_TEMPLATES)
    expect(text).toContain('TOKYO SUSHI BAR')
  })

  it('shows LIVRAISON for a DELIVERY order', () => {
    const order = createTestOrder()
    const text = generateDeliveryPreview(order, DEFAULT_TEMPLATES)
    expect(text).toContain('LIVRAISON')
  })

  it('shows RETRAIT for a PICKUP order', () => {
    const order = { ...createTestOrder(), type: 'PICKUP' as const }
    const text = generateDeliveryPreview(order, DEFAULT_TEMPLATES)
    expect(text).toContain('RETRAIT')
  })

  it('contains the customer name', () => {
    const order = createTestOrder()
    const text = generateDeliveryPreview(order, DEFAULT_TEMPLATES)
    expect(text).toContain('Marie Martin')
  })

  it('contains the phone number', () => {
    const order = createTestOrder()
    const text = generateDeliveryPreview(order, DEFAULT_TEMPLATES)
    expect(text).toContain('+32 477 12 34 56')
  })

  it('contains the street address', () => {
    const order = createTestOrder()
    const text = generateDeliveryPreview(order, DEFAULT_TEMPLATES)
    expect(text).toContain('Rue de la Paix 12')
    expect(text).toContain('4000 Liège')
  })

  it('contains addressExtra in parentheses', () => {
    const order = createTestOrder()
    const text = generateDeliveryPreview(order, DEFAULT_TEMPLATES)
    expect(text).toContain('(Sonnette 2B)')
  })

  it('falls back to displayAddress when address is null', () => {
    const order = { ...createTestOrder(), address: null }
    const text = generateDeliveryPreview(order, DEFAULT_TEMPLATES)
    expect(text).toContain('Rue de la Paix 12, 4000 Liège')
  })

  it('contains item names and prices', () => {
    const order = createTestOrder()
    const text = generateDeliveryPreview(order, DEFAULT_TEMPLATES)
    expect(text).toContain('Saumon Maki')
    expect(text).toContain('17,00€')
    expect(text).toContain('Miso Soupe')
    expect(text).toContain('3,00€')
  })

  it('shows delivery fee when positive', () => {
    const order = createTestOrder()
    const text = generateDeliveryPreview(order, DEFAULT_TEMPLATES)
    expect(text).toContain('Livraison')
    expect(text).toContain('2,50€')
  })

  it('does not show delivery fee when zero', () => {
    const order = { ...createTestOrder(), deliveryFee: '0.00' }
    const text = generateDeliveryPreview(order, DEFAULT_TEMPLATES)
    expect(text).not.toContain('Livraison')
  })

  it('shows discount when positive', () => {
    const order = { ...createTestOrder(), discountAmount: '3.00' }
    const text = generateDeliveryPreview(order, DEFAULT_TEMPLATES)
    expect(text).toContain('Réduction')
    expect(text).toContain('-3,00€')
  })

  it('shows total price', () => {
    const order = createTestOrder()
    const text = generateDeliveryPreview(order, DEFAULT_TEMPLATES)
    expect(text).toContain('TOTAL')
    expect(text).toContain('22,50€')
  })

  it('contains extras', () => {
    const order = createTestOrder()
    const text = generateDeliveryPreview(order, DEFAULT_TEMPLATES)
    expect(text).toContain('+ Sauce soja: x2')
  })

  it('contains the order note', () => {
    const order = createTestOrder()
    const text = generateDeliveryPreview(order, DEFAULT_TEMPLATES)
    expect(text).toContain('Note: Sans wasabi')
  })

  it('shows online payment label', () => {
    const order = createTestOrder()
    const text = generateDeliveryPreview(order, DEFAULT_TEMPLATES)
    expect(text).toContain('Paiement: En ligne')
  })

  it('shows cash payment label for offline payment', () => {
    const order = { ...createTestOrder(), isOnlinePayment: false }
    const text = generateDeliveryPreview(order, DEFAULT_TEMPLATES)
    expect(text).toContain('Paiement: Espèces')
  })

  it('omits customer section when disabled', () => {
    const order = createTestOrder()
    const templates = cloneTemplates(DEFAULT_TEMPLATES)
    templates.delivery.sections.customer.enabled = false
    const text = generateDeliveryPreview(order, templates)
    expect(text).not.toContain('Marie Martin')
  })

  it('omits notes section when disabled', () => {
    const order = createTestOrder()
    const templates = cloneTemplates(DEFAULT_TEMPLATES)
    templates.delivery.sections.notes.enabled = false
    const text = generateDeliveryPreview(order, templates)
    expect(text).not.toContain('Sans wasabi')
  })

  it('omits extras section when disabled', () => {
    const order = createTestOrder()
    const templates = cloneTemplates(DEFAULT_TEMPLATES)
    templates.delivery.sections.extras.enabled = false
    const text = generateDeliveryPreview(order, templates)
    expect(text).not.toContain('Sauce soja')
  })

  it('uses custom restaurantName from template', () => {
    const order = createTestOrder()
    const templates = cloneTemplates(DEFAULT_TEMPLATES)
    templates.delivery.sections.header.restaurantName = 'MY RESTAURANT'
    const text = generateDeliveryPreview(order, templates)
    expect(text).toContain('MY RESTAURANT')
    expect(text).not.toContain('TOKYO SUSHI BAR')
  })

  it('respects section reordering — notes before items', () => {
    const order = createTestOrder()
    const templates = cloneTemplates(DEFAULT_TEMPLATES)
    // Move notes before items
    templates.delivery.sectionOrder = ['header', 'customer', 'address', 'timing', 'payment', 'notes', 'items', 'extras']
    const text = generateDeliveryPreview(order, templates)
    const notesIdx = text.indexOf('Note:')
    const itemsIdx = text.indexOf('Saumon Maki')
    expect(notesIdx).toBeLessThan(itemsIdx)
  })

  it('contains separators between sections', () => {
    const order = createTestOrder()
    const text = generateDeliveryPreview(order, DEFAULT_TEMPLATES)
    const sepCount = (text.match(new RegExp(SEP.replace(/-/g, '\\-'), 'g')) ?? []).length
    expect(sepCount).toBeGreaterThanOrEqual(4)
  })

  it('skips timing section when no ready time is set', () => {
    const order = { ...createTestOrder(), estimatedReadyTime: null, preferredReadyTime: null }
    const text = generateDeliveryPreview(order, DEFAULT_TEMPLATES)
    expect(text).not.toContain('Prêt pour:')
  })

  it('shows estimatedReadyTime when present', () => {
    const order = createTestOrder()
    const text = generateDeliveryPreview(order, DEFAULT_TEMPLATES)
    expect(text).toContain('Prêt pour:')
  })
})

// ─── generateKitchenPreview ───────────────────────────────────────────────────

describe('generateKitchenPreview', () => {
  it('always ends with the thick separator', () => {
    const order = createTestOrder()
    const text = generateKitchenPreview(order, DEFAULT_TEMPLATES)
    expect(text.trimEnd().endsWith(SEP_THICK)).toBe(true)
  })

  it('contains the kitchen title', () => {
    const order = createTestOrder()
    const text = generateKitchenPreview(order, DEFAULT_TEMPLATES)
    expect(text).toContain('CUISINE')
  })

  it('contains item names without prices', () => {
    const order = createTestOrder()
    const text = generateKitchenPreview(order, DEFAULT_TEMPLATES)
    expect(text).toContain('2x Saumon Maki (8 pcs)')
    expect(text).toContain('1x Miso Soupe')
    // No prices on kitchen ticket
    expect(text).not.toContain('17,00€')
    expect(text).not.toContain('3,00€')
  })

  it('shows LIVRAISON for delivery orders', () => {
    const order = createTestOrder()
    const text = generateKitchenPreview(order, DEFAULT_TEMPLATES)
    expect(text).toContain('LIVRAISON')
  })

  it('shows RETRAIT for pickup orders', () => {
    const order = { ...createTestOrder(), type: 'PICKUP' as const }
    const text = generateKitchenPreview(order, DEFAULT_TEMPLATES)
    expect(text).toContain('RETRAIT')
  })

  it('contains extras', () => {
    const order = createTestOrder()
    const text = generateKitchenPreview(order, DEFAULT_TEMPLATES)
    expect(text).toContain('+ Sauce soja: x2')
  })

  it('contains the order note', () => {
    const order = createTestOrder()
    const text = generateKitchenPreview(order, DEFAULT_TEMPLATES)
    expect(text).toContain('Note: Sans wasabi')
  })

  it('omits notes section when disabled', () => {
    const order = createTestOrder()
    const templates = cloneTemplates(DEFAULT_TEMPLATES)
    templates.kitchen.sections.notes.enabled = false
    const text = generateKitchenPreview(order, templates)
    expect(text).not.toContain('Sans wasabi')
  })

  it('omits items section when disabled', () => {
    const order = createTestOrder()
    const templates = cloneTemplates(DEFAULT_TEMPLATES)
    templates.kitchen.sections.items.enabled = false
    const text = generateKitchenPreview(order, templates)
    expect(text).not.toContain('Saumon Maki')
  })

  it('uses custom kitchen title from template', () => {
    const order = createTestOrder()
    const templates = cloneTemplates(DEFAULT_TEMPLATES)
    templates.kitchen.sections.header.title = 'BAR SUSHI'
    const text = generateKitchenPreview(order, templates)
    expect(text).toContain('BAR SUSHI')
    expect(text).not.toContain('CUISINE')
  })

  it('does not contain customer address or payment info', () => {
    const order = createTestOrder()
    const text = generateKitchenPreview(order, DEFAULT_TEMPLATES)
    expect(text).not.toContain('Paiement')
    expect(text).not.toContain('Client:')
    expect(text).not.toContain('Rue de la Paix')
  })

  it('skips extras section when order has no extras', () => {
    const order = { ...createTestOrder(), orderExtra: [] }
    const templates = cloneTemplates(DEFAULT_TEMPLATES)
    const withExtras = generateKitchenPreview(createTestOrder(), templates)
    const withoutExtras = generateKitchenPreview(order, templates)
    expect(withExtras).toContain('Sauce soja')
    expect(withoutExtras).not.toContain('Sauce soja')
  })
})
