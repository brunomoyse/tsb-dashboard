import type { Order, TicketTemplates } from '~/types'

// ─── Default templates ────────────────────────────────────────────────────────

export const DEFAULT_TEMPLATES: TicketTemplates = {
  delivery: {
    sectionOrder: ['header', 'customer', 'address', 'timing', 'payment', 'items', 'extras', 'notes'],
    sections: {
      header: { enabled: true, restaurantName: 'TOKYO SUSHI BAR' },
      customer: { enabled: true },
      address: { enabled: true },
      timing: { enabled: true },
      payment: { enabled: true },
      items: { enabled: true },
      extras: { enabled: true },
      notes: { enabled: true },
    },
  },
  kitchen: {
    sectionOrder: ['header', 'orderInfo', 'items', 'extras', 'notes'],
    sections: {
      header: { enabled: true, title: 'CUISINE' },
      orderInfo: { enabled: true },
      items: { enabled: true },
      extras: { enabled: true },
      notes: { enabled: true },
    },
  },
}

// ─── Test order factory ───────────────────────────────────────────────────────

export function createTestOrder(): Order {
  return {
    id: 'test-0000-0000-0000-000000000001',
    type: 'DELIVERY',
    status: 'PREPARING',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId: 'user-1',
    addressId: 'addr-1',
    addressExtra: 'Sonnette 2B',
    deliveryFee: '2.50',
    discountAmount: '0',
    preferredReadyTime: null,
    estimatedReadyTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    isOnlinePayment: true,
    isManualAddress: false,
    orderNote: 'Sans wasabi',
    orderExtra: [{ name: 'Sauce soja', options: ['x2'] }],
    paymentID: 'tr_test',
    totalPrice: '22.50',
    displayCustomerName: 'Marie Martin',
    displayAddress: 'Rue de la Paix 12, 4000 Liège',
    address: {
      id: 'addr-1',
      streetName: 'Rue de la Paix',
      houseNumber: '12',
      boxNumber: null,
      municipalityName: 'Liège',
      postcode: '4000',
      distance: 1200,
    },
    payment: null,
    customer: {
      id: 'customer-1',
      firstName: 'Marie',
      lastName: 'Martin',
      phoneNumber: '+32 477 12 34 56',
    },
    items: [
      {
        quantity: 2,
        unitPrice: '8.50',
        totalPrice: '17.00',
        choice: null,
        product: {
          id: 'p1',
          name: 'Saumon Maki (8 pcs)',
          code: 'SM8',
          slug: 'saumon-maki',
          price: '8.50',
          categoryId: 'c1',
          isAvailable: true,
          isDiscountable: true,
          isHalal: false,
          isSpicy: false,
          isVegan: false,
          isVisible: true,
          pieceCount: 8,
          description: null,
          category: { id: 'c1', name: 'Makis', order: 1, translations: [] },
          choices: [],
          translations: [],
        },
      },
      {
        quantity: 1,
        unitPrice: '3.00',
        totalPrice: '3.00',
        choice: null,
        product: {
          id: 'p2',
          name: 'Miso Soupe',
          code: 'MS',
          slug: 'miso-soupe',
          price: '3.00',
          categoryId: 'c2',
          isAvailable: true,
          isDiscountable: true,
          isHalal: false,
          isSpicy: false,
          isVegan: true,
          isVisible: true,
          pieceCount: null,
          description: null,
          category: { id: 'c2', name: 'Soupes', order: 2, translations: [] },
          choices: [],
          translations: [],
        },
      },
    ],
  }
}

// ─── Text-based preview generator ────────────────────────────────────────────

const SEP = '-'.repeat(32)
const SEP_THICK = '='.repeat(32)

function fmtPrice(price: string | number): string {
  return `${Number(price).toFixed(2).replace('.', ',')}€`
}

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr)
  const day = d.getDate().toString().padStart(2, '0')
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const year = d.getFullYear()
  const h = d.getHours().toString().padStart(2, '0')
  const m = d.getMinutes().toString().padStart(2, '0')
  return `${day}/${month}/${year} ${h}:${m}`
}

/** Generate an ASCII text preview for a delivery ticket. */
export function generateDeliveryPreview(order: Order, templates: TicketTemplates): string {
  const sections = templates.delivery.sections
  const sectionOrder = templates.delivery.sectionOrder as string[]
  const lines: string[] = []

  for (const key of sectionOrder) {
    const cfg = sections[key as keyof typeof sections]
    if (cfg?.enabled === false) continue

    switch (key) {
      case 'header': {
        const name = (cfg as any)?.restaurantName ?? 'TOKYO SUSHI BAR'
        lines.push(name.padStart(Math.floor((32 + name.length) / 2)))
        lines.push(SEP_THICK)
        const typeLabel = order.type === 'DELIVERY' ? 'LIVRAISON' : 'RETRAIT'
        const orderId = order.id.substring(0, 8).toUpperCase()
        lines.push(fmtDate(order.createdAt))
        lines.push(`Cmd #${orderId}  ${typeLabel}`)
        break
      }
      case 'customer': {
        if (!order.customer) break
        lines.push(SEP)
        lines.push(`Client: ${order.customer.firstName} ${order.customer.lastName}`)
        if (order.customer.phoneNumber) lines.push(`Tel: ${order.customer.phoneNumber}`)
        break
      }
      case 'address': {
        if (!order.address && !order.displayAddress) break
        lines.push(SEP)
        if (order.address) {
          const { streetName, houseNumber, boxNumber, postcode, municipalityName } = order.address
          const box = boxNumber ? ` bte ${boxNumber}` : ''
          lines.push(`${streetName} ${houseNumber}${box}`)
          lines.push(`${postcode} ${municipalityName}`)
        } else if (order.displayAddress) {
          lines.push(order.displayAddress)
        }
        if (order.addressExtra) lines.push(`(${order.addressExtra})`)
        break
      }
      case 'timing': {
        const ready = order.estimatedReadyTime ?? order.preferredReadyTime
        if (!ready) break
        lines.push(SEP)
        lines.push(`Prêt pour: ${fmtDate(ready)}`)
        break
      }
      case 'payment': {
        lines.push(SEP)
        lines.push(`Paiement: ${order.isOnlinePayment ? 'En ligne' : 'Espèces'}`)
        break
      }
      case 'items': {
        lines.push(SEP)
        for (const item of order.items) {
          const choice = item.choice?.name ? ` (${item.choice.name})` : ''
          const label = `${item.quantity}x ${item.product.name}${choice}`
          lines.push(`${label.slice(0, 24).padEnd(24)} ${fmtPrice(item.totalPrice).padStart(7)}`)
        }
        lines.push(SEP)
        if (parseFloat(order.discountAmount) > 0) {
          lines.push(`${'Réduction'.padEnd(24)} ${`-${fmtPrice(order.discountAmount)}`.padStart(7)}`)
        }
        if (order.deliveryFee && parseFloat(order.deliveryFee) > 0) {
          lines.push(`${'Livraison'.padEnd(24)} ${fmtPrice(order.deliveryFee).padStart(7)}`)
        }
        lines.push(`${'TOTAL'.padEnd(24)} ${fmtPrice(order.totalPrice).padStart(7)}`)
        break
      }
      case 'extras': {
        if (!order.orderExtra?.length) break
        lines.push(SEP)
        for (const extra of order.orderExtra) {
          if (extra.name) {
            const opts = extra.options?.length ? `: ${extra.options.join(', ')}` : ''
            lines.push(`+ ${extra.name}${opts}`)
          }
        }
        break
      }
      case 'notes': {
        if (!order.orderNote) break
        lines.push(SEP)
        lines.push(`Note: ${order.orderNote}`)
        break
      }
    }
  }

  lines.push(SEP_THICK)
  lines.push('      Merci et à bientôt!')
  lines.push(SEP_THICK)
  return lines.join('\n')
}

/** Generate an ASCII text preview for a kitchen ticket. */
export function generateKitchenPreview(order: Order, templates: TicketTemplates): string {
  const sections = templates.kitchen.sections
  const sectionOrder = templates.kitchen.sectionOrder as string[]
  const lines: string[] = []

  for (const key of sectionOrder) {
    const cfg = sections[key as keyof typeof sections]
    if (cfg?.enabled === false) continue

    switch (key) {
      case 'header': {
        const title = (cfg as any)?.title ?? 'CUISINE'
        lines.push(title.padStart(Math.floor((32 + title.length) / 2)))
        lines.push(SEP_THICK)
        break
      }
      case 'orderInfo': {
        const orderId = order.id.substring(0, 8).toUpperCase()
        const typeLabel = order.type === 'DELIVERY' ? 'LIVRAISON' : 'RETRAIT'
        lines.push(`#${orderId}  ${typeLabel}`)
        lines.push(fmtDate(order.createdAt))
        break
      }
      case 'items': {
        lines.push(SEP)
        for (const item of order.items) {
          const choice = item.choice?.name ? ` (${item.choice.name})` : ''
          lines.push(`${item.quantity}x ${item.product.name}${choice}`)
        }
        break
      }
      case 'extras': {
        if (!order.orderExtra?.length) break
        lines.push(SEP)
        for (const extra of order.orderExtra) {
          if (extra.name) {
            const opts = extra.options?.length ? `: ${extra.options.join(', ')}` : ''
            lines.push(`+ ${extra.name}${opts}`)
          }
        }
        break
      }
      case 'notes': {
        if (!order.orderNote) break
        lines.push(SEP)
        lines.push(`Note: ${order.orderNote}`)
        break
      }
    }
  }

  lines.push(SEP_THICK)
  return lines.join('\n')
}
