/**
 * TSB Restaurant Receipt Formatter
 *
 * Formats receipts and kitchen tickets aligned with the Android PrintHandler.kt layout.
 * 48-char width for 80mm paper with Font A.
 */

import type { Order, OrderProduct } from '~/types'
import type { EpsonPrinterCommands } from '~/composables/useEpsonPrinter'

const LINE_WIDTH = 48
const SEPARATOR = '-'.repeat(LINE_WIDTH)
const DOUBLE_SEPARATOR = '='.repeat(LINE_WIDTH)

// --- Helpers ---

/** Parse a string price (e.g. "12.50") to a number */
const parsePrice = (str: string): number => {
  const num = parseFloat(str)
  return isNaN(num) ? 0 : num
}

/** Format a number as Belgian price (e.g. "12,50") */
const formatPrice = (num: number): string =>
  num.toFixed(2).replace('.', ',')

/** Format price with euro symbol */
const formatPriceEuro = (num: number): string =>
  `${formatPrice(num)} \u20AC`

/** Format date for receipt (French locale) */
export const formatReceiptDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleString('fr-BE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/** Format time for receipt (French locale) */
export const formatReceiptTime = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleTimeString('fr-BE', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

/** Format a category header like *** Category *** */
const formatCategoryHeader = (name: string): string => {
  const header = `*** ${name.toUpperCase()} ***`
  const padding = Math.max(0, Math.floor((LINE_WIDTH - header.length) / 2))
  return ' '.repeat(padding) + header
}

/** Sort items by code: prefix letter first, then number */
const sortByCode = (items: OrderProduct[]): OrderProduct[] =>
  [...items].sort((a, b) => {
    const codeA = a.product.code || ''
    const codeB = b.product.code || ''
    // Extract letter prefix and numeric part
    const matchA = codeA.match(/^([A-Za-z]*)(\d*)$/)
    const matchB = codeB.match(/^([A-Za-z]*)(\d*)$/)
    if (!matchA || !matchB) return codeA.localeCompare(codeB)
    // Compare prefix first
    const prefixCmp = (matchA[1] || '').localeCompare(matchB[1] || '')
    if (prefixCmp !== 0) return prefixCmp
    // Then numeric part
    return (parseInt(matchA[2], 10) || 0) - (parseInt(matchB[2], 10) || 0)
  })

/** Group items by category name */
const groupByCategory = (items: OrderProduct[]): Map<string, OrderProduct[]> => {
  const groups = new Map<string, OrderProduct[]>()
  for (const item of items) {
    const catName = item.product.category?.name || 'Autres'
    if (!groups.has(catName)) {
      groups.set(catName, [])
    }
    groups.get(catName)!.push(item)
  }
  return groups
}

/** Map order extra name to French label */
const mapExtraLabel = (name: string | null, options: string[] | null): string[] => {
  const labels: string[] = []
  if (!name || !options) return labels

  const lowerName = (name || '').toLowerCase()

  if (lowerName === 'chopsticks' || lowerName === 'baguettes') {
    for (const opt of options) {
      const qty = parseInt(opt, 10)
      if (!isNaN(qty) && qty > 0) {
        labels.push(`Baguettes: ${qty}`)
      }
    }
  } else if (lowerName === 'sauces' || lowerName === 'sauce') {
    for (const opt of options) {
      const lower = opt.toLowerCase()
      if (lower === 'sweet' || lower === 'sucree' || lower === 'sucrée') {
        labels.push('Sauce sucrée')
      } else if (lower === 'salty' || lower === 'salee' || lower === 'salée') {
        labels.push('Sauce salée')
      } else {
        labels.push(`Sauce: ${opt}`)
      }
    }
  } else {
    labels.push(`${name}: ${options.join(', ')}`)
  }

  return labels
}

/** Get display name for item, appending choice if present */
const getItemDisplayName = (item: OrderProduct): string => {
  let name = item.product.name || ''
  if (item.choice?.name) {
    name = `${name} (${item.choice.name})`
  }
  return name
}

// --- Delivery Ticket ---

const addDeliveryHeader = (cmd: EpsonPrinterCommands, order: Order): void => {
  cmd.addTextAlign('center')
  cmd.addTextSize(3, 3)
  const orderType = order.type === 'DELIVERY' ? 'LIVRAISON' : 'A EMPORTER'
  cmd.addText(`${orderType}\n`)
  cmd.addTextSize(1, 1)
  cmd.addText(`${DOUBLE_SEPARATOR}\n`)

  // Order number
  cmd.addTextSize(2, 2)
  cmd.addText(`#${order.id.substring(0, 8)}\n`)
  cmd.addTextSize(1, 1)
  cmd.addText(`${SEPARATOR}\n`)
}

const addDeliveryAddress = (cmd: EpsonPrinterCommands, order: Order): void => {
  if (order.type !== 'DELIVERY' || !order.address) return

  cmd.addTextAlign('left')
  cmd.addTextStyle({ bold: true })
  cmd.addTextSize(2, 1)
  let addressLine = `${order.address.streetName} ${order.address.houseNumber}`
  if (order.address.boxNumber) {
    addressLine += ` bte ${order.address.boxNumber}`
  }
  cmd.addText(`${addressLine}\n`)
  cmd.addText(`${order.address.postcode} ${order.address.municipalityName}\n`)
  cmd.addTextSize(1, 1)
  cmd.addTextStyle({ bold: false })

  if (order.addressExtra) {
    cmd.addFeedLine(1)
    cmd.addTextStyle({ bold: true })
    cmd.addTextSize(2, 1)
    cmd.addText(`>> ${order.addressExtra}\n`)
    cmd.addTextSize(1, 1)
    cmd.addTextStyle({ bold: false })
  }

  cmd.addText(`${SEPARATOR}\n`)
}

const addDeliveryCustomer = (cmd: EpsonPrinterCommands, order: Order): void => {
  if (!order.customer) return

  cmd.addTextAlign('left')
  cmd.addText(`Client: ${order.customer.firstName} ${order.customer.lastName}\n`)

  if (order.customer.phoneNumber) {
    cmd.addTextStyle({ bold: true })
    cmd.addTextSize(2, 1)
    cmd.addText(`Tel: ${order.customer.phoneNumber}\n`)
    cmd.addTextSize(1, 1)
    cmd.addTextStyle({ bold: false })
  }

  cmd.addText(`${SEPARATOR}\n`)
}

const addDeliveryTiming = (cmd: EpsonPrinterCommands, order: Order): void => {
  cmd.addTextAlign('left')

  cmd.addTextStyle({ bold: true })
  cmd.addTextSize(2, 1)
  if (order.preferredReadyTime) {
    cmd.addText(`Souhaitee: ${formatReceiptTime(order.preferredReadyTime)}\n`)
  } else {
    cmd.addText('Des que possible\n')
  }
  cmd.addTextSize(1, 1)
  cmd.addTextStyle({ bold: false })

  if (order.estimatedReadyTime) {
    cmd.addText(`Pret: ${formatReceiptTime(order.estimatedReadyTime)}\n`)
  }

  cmd.addText(`${SEPARATOR}\n`)
}

const addDeliveryPayment = (cmd: EpsonPrinterCommands, order: Order): void => {
  cmd.addTextAlign('left')

  const total = parsePrice(order.totalPrice)

  if (order.isOnlinePayment) {
    // Online payment — already paid
    cmd.addTextAlign('center')
    cmd.addTextSize(2, 1)
    cmd.addText('Paye en ligne\n')
    cmd.addTextSize(1, 1)
    cmd.addText(`Total: ${formatPriceEuro(total)}\n`)
  } else {
    // Cash payment — driver needs to collect money
    cmd.addTextAlign('center')
    cmd.addTextStyle({ bold: true })
    cmd.addTextSize(2, 2)
    cmd.addText('A ENCAISSER\n')
    cmd.addTextSize(2, 1)
    cmd.addText(`${formatPriceEuro(total)}\n`)
    cmd.addTextSize(1, 1)
    cmd.addTextStyle({ bold: false })
  }

  cmd.addText(`${SEPARATOR}\n`)
}

const addDeliveryItems = (cmd: EpsonPrinterCommands, order: Order): void => {
  cmd.addTextAlign('left')
  cmd.addTextFont('A')

  const groups = groupByCategory(order.items)

  for (const [categoryName, items] of groups) {
    cmd.addTextStyle({ bold: true })
    cmd.addText(`${formatCategoryHeader(categoryName)}\n`)
    cmd.addTextStyle({ bold: false })

    const sorted = sortByCode(items)

    for (const item of sorted) {
      const name = getItemDisplayName(item)
      const code = item.product.code ? `${item.product.code} ` : ''
      cmd.addText(`  ${item.quantity}x ${code}${name}\n`)
    }

    cmd.addFeedLine(1)
  }
}

const addDeliveryExtras = (cmd: EpsonPrinterCommands, order: Order): void => {
  if (!order.orderExtra || order.orderExtra.length === 0) return

  cmd.addTextAlign('left')
  cmd.addTextStyle({ bold: true })
  cmd.addText('Extras:\n')
  cmd.addTextStyle({ bold: false })

  for (const extra of order.orderExtra) {
    const labels = mapExtraLabel(extra.name, extra.options)
    for (const label of labels) {
      cmd.addText(`  ${label}\n`)
    }
  }

  cmd.addText(`${SEPARATOR}\n`)
}

const addDeliveryFooter = (cmd: EpsonPrinterCommands, order: Order): void => {
  if (order.orderNote) {
    cmd.addTextAlign('center')
    cmd.addTextStyle({ bold: true })
    cmd.addText('NOTE:\n')
    cmd.addTextStyle({ bold: false })
    cmd.addTextAlign('left')
    cmd.addText(`${order.orderNote}\n`)
    cmd.addText(`${SEPARATOR}\n`)
  }

  cmd.addFeedLine(2)
}

/**
 * Build delivery ticket for an order (DELIVERY COPY)
 * Address-focused layout for the delivery driver.
 * For pickup orders, serves as a compact order summary.
 */
export const buildDeliveryTicket = (order: Order) => (cmd: EpsonPrinterCommands) => {
  addDeliveryHeader(cmd, order)
  addDeliveryAddress(cmd, order)
  addDeliveryCustomer(cmd, order)
  addDeliveryTiming(cmd, order)
  addDeliveryPayment(cmd, order)
  addDeliveryItems(cmd, order)
  addDeliveryExtras(cmd, order)
  addDeliveryFooter(cmd, order)
  cmd.addCut()
}

// --- Kitchen Ticket ---

const addKitchenHeader = (cmd: EpsonPrinterCommands, order: Order): void => {
  cmd.addTextAlign('center')
  cmd.addTextSize(3, 3)
  cmd.addText('*** CUISINE ***\n')
  cmd.addTextSize(1, 1)
  cmd.addText(`${DOUBLE_SEPARATOR}\n`)

  // Order type - large and prominent
  cmd.addTextSize(2, 2)
  cmd.addTextStyle({ bold: true })
  const orderType = order.type === 'DELIVERY' ? 'LIVRAISON' : 'A EMPORTER'
  cmd.addText(`${orderType}\n`)
  cmd.addTextSize(1, 1)
  cmd.addTextStyle({ bold: false })
  cmd.addText(`${DOUBLE_SEPARATOR}\n`)
}

const addKitchenOrderInfo = (cmd: EpsonPrinterCommands, order: Order): void => {
  cmd.addTextAlign('left')

  // Order number
  cmd.addTextSize(2, 2)
  cmd.addText(`#${order.id.substring(0, 8)}\n`)
  cmd.addTextSize(1, 1)

  // Time info
  cmd.addText(`Commande: ${formatReceiptTime(order.createdAt)}\n`)

  if (order.preferredReadyTime) {
    cmd.addTextStyle({ bold: true })
    cmd.addTextSize(2, 1)
    cmd.addText(`Souhaitee: ${formatReceiptTime(order.preferredReadyTime)}\n`)
    cmd.addTextSize(1, 1)
    cmd.addTextStyle({ bold: false })
  }

  if (order.estimatedReadyTime) {
    cmd.addTextStyle({ bold: true })
    cmd.addTextSize(2, 1)
    cmd.addText(`Pret: ${formatReceiptTime(order.estimatedReadyTime)}\n`)
    cmd.addTextSize(1, 1)
    cmd.addTextStyle({ bold: false })
  }

  cmd.addText(`${SEPARATOR}\n`)
}

const addKitchenItems = (cmd: EpsonPrinterCommands, order: Order): void => {
  cmd.addTextAlign('left')

  // Group items by category
  const groups = groupByCategory(order.items)

  for (const [categoryName, items] of groups) {
    // Category header
    cmd.addTextStyle({ bold: true })
    cmd.addText(`${formatCategoryHeader(categoryName)}\n`)
    cmd.addTextStyle({ bold: false })
    cmd.addFeedLine(1)

    // Sort items by code within category
    const sorted = sortByCode(items)

    for (const item of sorted) {
      const name = getItemDisplayName(item)
      const code = item.product.code ? `${item.product.code} ` : ''

      // Quantity - large
      cmd.addTextSize(2, 2)
      cmd.addText(`${item.quantity}x `)
      cmd.addTextSize(1, 1)
      cmd.addText(`${code}${name}\n`)

      cmd.addFeedLine(1)
    }
  }

  cmd.addText(`${SEPARATOR}\n`)
}

const addKitchenExtras = (cmd: EpsonPrinterCommands, order: Order): void => {
  if (!order.orderExtra || order.orderExtra.length === 0) return

  cmd.addTextAlign('left')
  cmd.addTextStyle({ bold: true })
  cmd.addText('EXTRAS:\n')
  cmd.addTextStyle({ bold: false })

  for (const extra of order.orderExtra) {
    const labels = mapExtraLabel(extra.name, extra.options)
    for (const label of labels) {
      cmd.addTextSize(2, 1)
      cmd.addText(`  ${label}\n`)
      cmd.addTextSize(1, 1)
    }
  }

  cmd.addText(`${SEPARATOR}\n`)
}

const addKitchenFooter = (cmd: EpsonPrinterCommands, order: Order): void => {
  // Order notes - very important for kitchen
  if (order.orderNote) {
    cmd.addTextAlign('center')
    cmd.addTextSize(2, 2)
    cmd.addTextStyle({ bold: true })
    cmd.addText('!!! NOTE !!!\n')
    cmd.addTextSize(1, 1)
    cmd.addTextStyle({ bold: false })
    cmd.addTextAlign('left')
    cmd.addText(`${order.orderNote}\n`)
    cmd.addText(`${SEPARATOR}\n`)
  }

  cmd.addFeedLine(2)
}

/**
 * Build kitchen ticket for an order (KITCHEN COPY)
 */
export const buildKitchenTicket = (order: Order) => (cmd: EpsonPrinterCommands) => {
  addKitchenHeader(cmd, order)
  addKitchenOrderInfo(cmd, order)
  addKitchenItems(cmd, order)
  addKitchenExtras(cmd, order)
  addKitchenFooter(cmd, order)
  cmd.addCut()
}

// --- Test Order ---

/**
 * Create a test order for printer testing
 */
// eslint-disable-next-line arrow-body-style
export const createTestOrder = (): Order => {
  return {
    id: 'test-12345',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'PENDING',
    type: 'DELIVERY',
    isOnlinePayment: true,
    discountAmount: '5.00',
    deliveryFee: '2.50',
    totalPrice: '27.50',
    preferredReadyTime: null,
    estimatedReadyTime: new Date(Date.now() + 30 * 60000).toISOString(),
    addressExtra: 'Sonnez 2 fois',
    addressId: 'test-address',
    orderNote: 'Test de l\'imprimante - pas de wasabi',
    orderExtra: [
      { name: 'chopsticks', options: ['4'] },
      { name: 'sauces', options: ['sweet', 'salty'] }
    ],
    paymentID: null,
    userId: 'test-user',
    displayCustomerName: 'Test User',
    displayAddress: 'Rue de Test 123, 1000 Brussels',
    customer: {
      id: 'test-customer',
      firstName: 'Test',
      lastName: 'User',
      phoneNumber: '+32 123 45 67 89'
    },
    address: {
      id: 'test-address',
      streetName: 'Rue de Test',
      houseNumber: '123',
      boxNumber: '4A',
      municipalityName: 'Brussels',
      postcode: '1000',
      distance: 2.5
    },
    payment: {
      id: 'pay-test',
      createdAt: new Date().toISOString(),
      orderId: 'test-12345',
      paidAt: new Date().toISOString(),
      status: 'paid',
      links: {}
    },
    items: [
      {
        unitPrice: '10.00',
        quantity: 2,
        totalPrice: '20.00',
        product: {
          id: 'test-product-1',
          code: 'E10',
          name: 'California Roll',
          slug: 'california-roll',
          price: '10.00',
          isAvailable: true,
          isDiscountable: true,
          isHalal: false,
          isVegan: false,
          isVisible: true,
          pieceCount: 8,
          categoryId: 'cat-1',
          category: {
            id: 'cat-1',
            name: 'Makis',
            order: 1,
            translations: []
          },
          choices: [],
          translations: []
        },
        choice: null
      },
      {
        unitPrice: '5.00',
        quantity: 2,
        totalPrice: '10.00',
        product: {
          id: 'test-product-2',
          code: 'E16',
          name: 'Saumon Roll',
          slug: 'saumon-roll',
          price: '5.00',
          isAvailable: true,
          isDiscountable: true,
          isHalal: false,
          isVegan: false,
          isVisible: true,
          pieceCount: 6,
          categoryId: 'cat-1',
          category: {
            id: 'cat-1',
            name: 'Makis',
            order: 1,
            translations: []
          },
          choices: [],
          translations: []
        },
        choice: null
      },
      {
        unitPrice: '12.00',
        quantity: 1,
        totalPrice: '12.00',
        product: {
          id: 'test-product-3',
          code: 'A3',
          name: 'Gyoza',
          slug: 'gyoza',
          price: '12.00',
          isAvailable: true,
          isDiscountable: true,
          isHalal: false,
          isVegan: false,
          isVisible: true,
          pieceCount: 6,
          categoryId: 'cat-2',
          category: {
            id: 'cat-2',
            name: 'Entrees',
            order: 0,
            translations: []
          },
          choices: [],
          translations: []
        },
        choice: {
          id: 'choice-1',
          productId: 'test-product-3',
          priceModifier: '0.00',
          sortOrder: 0,
          name: 'Poulet',
          translations: []
        }
      }
    ]
  }
}
