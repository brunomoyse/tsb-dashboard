/**
 * TSB Restaurant Receipt Formatter
 *
 * Project-specific logic for formatting and printing restaurant receipts.
 * Builds receipt content using Epson printer commands.
 */

import type { Order } from '~/types'
import type { EpsonPrinterCommands } from '~/composables/useEpsonPrinter'

/**
 * Format date for receipt (French locale)
 */
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

/**
 * Format time for receipt (French locale)
 */
export const formatReceiptTime = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleTimeString('fr-BE', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Format price for receipt (Euro)
 */
export const formatReceiptPrice = (price: number): string => {
  return new Intl.NumberFormat('fr-BE', {
    style: 'currency',
    currency: 'EUR'
  }).format(price)
}

/**
 * Add receipt header with restaurant name
 */
const addHeader = (cmd: EpsonPrinterCommands): void => {
  cmd.addTextAlign('center')
  cmd.addTextSize(2, 2)
  cmd.addText('TOKYO SUSHI BAR\n')
  cmd.addTextSize(1, 1)
  cmd.addText('--------------------------------\n')
}

/**
 * Add order information section
 */
const addOrderInfo = (cmd: EpsonPrinterCommands, order: Order): void => {
  cmd.addTextAlign('left')
  cmd.addText(`Date: ${formatReceiptDate(order.createdAt)}\n`)
  cmd.addText(`Commande #${order.id.substring(0, 8)}\n`)
  cmd.addText(`Client: ${order.customer?.firstName} ${order.customer?.lastName}\n`)
  cmd.addText(`Tel: ${order.customer?.phoneNumber}\n`)

  // Order type
  const orderType = order.type === 'DELIVERY' ? 'Livraison' : 'À emporter'
  cmd.addText(`Type: ${orderType}\n`)

  // Delivery address
  if (order.type === 'DELIVERY' && order.address) {
    cmd.addText(`Adresse: ${order.address.streetName} ${order.address.houseNumber}\n`)
    cmd.addText(`${order.address.postcode} ${order.address.municipalityName}\n`)
  }

  // Estimated time
  if (order.estimatedReadyTime) {
    const estimatedTime = formatReceiptTime(order.estimatedReadyTime)
    cmd.addText(`Heure estimée: ${estimatedTime}\n`)
  }

  cmd.addText('--------------------------------\n')
}

/**
 * Add order items section
 */
const addItems = (cmd: EpsonPrinterCommands, order: Order): void => {
  cmd.addTextAlign('left')

  order.items.forEach(item => {
    const itemName = item.product.code || item.product.name
    const price = formatReceiptPrice(item.totalPrice)

    cmd.addText(`${item.quantity}x ${itemName}\n`)
    cmd.addTextAlign('right')
    cmd.addText(`${price}\n`)
    cmd.addTextAlign('left')
  })

  cmd.addText('--------------------------------\n')
}

/**
 * Add totals section with discount and delivery fee
 */
const addTotals = (cmd: EpsonPrinterCommands, order: Order): void => {
  // Discount
  if (order.discountAmount && order.discountAmount > 0) {
    cmd.addTextAlign('right')
    cmd.addText(`Remise: -${formatReceiptPrice(order.discountAmount)}\n`)
  }

  // Delivery fee
  if (order.deliveryFee && order.deliveryFee > 0) {
    cmd.addTextAlign('right')
    cmd.addText(`Livraison: ${formatReceiptPrice(order.deliveryFee)}\n`)
  }

  // Total
  cmd.addTextSize(2, 2)
  cmd.addTextAlign('right')
  cmd.addText(`TOTAL: ${formatReceiptPrice(order.totalPrice)}\n`)
  cmd.addTextSize(1, 1)

  cmd.addText('--------------------------------\n')
}

/**
 * Add payment method and notes
 */
const addFooter = (cmd: EpsonPrinterCommands, order: Order): void => {
  // Payment method
  cmd.addTextAlign('center')
  const paymentMethod = order.isOnlinePayment ? 'Paiement en ligne' : 'Paiement en espèces'
  cmd.addText(`${paymentMethod}\n`)

  // Order notes
  if (order.orderNote) {
    cmd.addText('--------------------------------\n')
    cmd.addText('Note:\n')
    cmd.addText(`${order.orderNote}\n`)
  }

  // Thank you message
  cmd.addText('--------------------------------\n')
  cmd.addFeedLine(1)
  cmd.addText('Merci de votre commande!\n')
  cmd.addFeedLine(3)
}

/**
 * Build complete receipt for an order (CLIENT COPY)
 */
export const buildOrderReceipt = (order: Order) => {
  return (cmd: EpsonPrinterCommands) => {
    addHeader(cmd)
    addOrderInfo(cmd, order)
    addItems(cmd, order)
    addTotals(cmd, order)
    addFooter(cmd, order)
    cmd.addCut()
  }
}

/**
 * Build kitchen ticket header
 */
const addKitchenHeader = (cmd: EpsonPrinterCommands, order: Order): void => {
  cmd.addTextAlign('center')
  cmd.addTextSize(3, 3)
  cmd.addText('*** CUISINE ***\n')
  cmd.addTextSize(1, 1)
  cmd.addText('================================\n')

  // Order type - large and prominent
  cmd.addTextSize(2, 2)
  const orderType = order.type === 'DELIVERY' ? 'LIVRAISON' : 'EMPORTER'
  cmd.addText(`${orderType}\n`)
  cmd.addTextSize(1, 1)
  cmd.addText('================================\n')
}

/**
 * Add kitchen order info (simplified)
 */
const addKitchenOrderInfo = (cmd: EpsonPrinterCommands, order: Order): void => {
  cmd.addTextAlign('left')

  // Order number - large
  cmd.addTextSize(2, 2)
  cmd.addText(`#${order.id.substring(0, 8)}\n`)
  cmd.addTextSize(1, 1)

  // Time info
  cmd.addText(`Commande: ${formatReceiptTime(order.createdAt)}\n`)

  if (order.estimatedReadyTime) {
    cmd.addTextSize(2, 2)
    cmd.addText(`Pret: ${formatReceiptTime(order.estimatedReadyTime)}\n`)
    cmd.addTextSize(1, 1)
  }

  cmd.addText('--------------------------------\n')
}

/**
 * Add kitchen items (with emphasis on quantity)
 */
const addKitchenItems = (cmd: EpsonPrinterCommands, order: Order): void => {
  cmd.addTextAlign('left')

  order.items.forEach(item => {
    const itemName = item.product.code || item.product.name

    // Quantity - large and bold
    cmd.addTextSize(2, 2)
    cmd.addText(`${item.quantity}x `)
    cmd.addTextSize(1, 1)
    cmd.addText(`${itemName}\n`)

    // Add spacing between items
    cmd.addFeedLine(1)
  })

  cmd.addText('--------------------------------\n')
}

/**
 * Add kitchen footer with notes
 */
const addKitchenFooter = (cmd: EpsonPrinterCommands, order: Order): void => {
  // Order notes - very important for kitchen
  if (order.orderNote) {
    cmd.addTextAlign('center')
    cmd.addTextSize(2, 2)
    cmd.addText('!!! NOTE !!!\n')
    cmd.addTextSize(1, 1)
    cmd.addTextAlign('left')
    cmd.addText(`${order.orderNote}\n`)
    cmd.addText('--------------------------------\n')
  }

  cmd.addFeedLine(2)
}

/**
 * Build kitchen ticket for an order (KITCHEN COPY)
 * Simplified version focused on preparation
 */
export const buildKitchenTicket = (order: Order) => {
  return (cmd: EpsonPrinterCommands) => {
    addKitchenHeader(cmd, order)
    addKitchenOrderInfo(cmd, order)
    addKitchenItems(cmd, order)
    addKitchenFooter(cmd, order)
    cmd.addCut()
  }
}

/**
 * Create a test order for printer testing
 */
export const createTestOrder = (): Order => {
  return {
    id: 'test-12345',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'PENDING',
    type: 'DELIVERY',
    isOnlinePayment: false,
    discountAmount: 0,
    deliveryFee: 2.5,
    totalPrice: 32.5,
    preferredReadyTime: null,
    estimatedReadyTime: new Date(Date.now() + 30 * 60000).toISOString(),
    addressExtra: null,
    orderNote: 'Test de l\'imprimante',
    orderExtra: null,
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
      municipalityName: 'Brussels',
      postcode: '1000',
      distance: 2.5
    },
    payment: {
      status: 'pending'
    },
    items: [
      {
        unitPrice: 10,
        quantity: 2,
        totalPrice: 20,
        product: {
          id: 'test-product-1',
          code: 'E10',
          name: 'California Roll',
          category: {
            id: 'cat-1',
            name: 'Makis'
          }
        }
      },
      {
        unitPrice: 10,
        quantity: 1,
        totalPrice: 10,
        product: {
          id: 'test-product-2',
          code: 'E16',
          name: 'Saumon Roll',
          category: {
            id: 'cat-1',
            name: 'Makis'
          }
        }
      }
    ]
  }
}