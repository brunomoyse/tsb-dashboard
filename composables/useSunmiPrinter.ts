import { onMounted, onUnmounted, ref } from 'vue'
import type { Order } from '~/types'

// ─── Receipt formatting helpers ────────────────────────────────────────────────

/** Compact price string: "20.50" → "20,50€" */
function receiptPrice(price: string | number): string {
  return `${Number(price).toFixed(2).replace('.', ',')}€`
}

/** Date + time formatted for a receipt: "28/03/2026 14:30" */
function receiptDateTime(dateStr: string): string {
  const d = new Date(dateStr)
  const day = d.getDate().toString().padStart(2, '0')
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const year = d.getFullYear()
  const hours = d.getHours().toString().padStart(2, '0')
  const mins = d.getMinutes().toString().padStart(2, '0')
  return `${day}/${month}/${year} ${hours}:${mins}`
}

const SEP = '-'.repeat(32)
const SEP_THICK = '='.repeat(32)

// ─── Composable ────────────────────────────────────────────────────────────────

export const useSunmiPrinter = () => {
  const isBound = ref(false)
  const status = ref<number | null>(null)
  const statusText = ref<string>('')

  /** True only when running inside Capacitor on an Android device. */
  const isNative = (): boolean =>
    typeof window !== 'undefined' &&
    Boolean((window as any).Capacitor?.isNativePlatform?.())

  /** Lazily import the plugin — avoids loading @capacitor/core on the server. */
  const getPlugin = async () => {
    const { SunmiPrinter } = await import('~/plugins/capacitor-sunmi-printer/src/index')
    return SunmiPrinter
  }

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  const bind = async (): Promise<void> => {
    if (!isNative()) return
    const plugin = await getPlugin()
    await plugin.bindService()
    isBound.value = true
    const result = await plugin.getStatus()
    status.value = result.status
    statusText.value = result.statusText
  }

  const unbind = async (): Promise<void> => {
    if (!isNative() || !isBound.value) return
    const plugin = await getPlugin()
    await plugin.unbindService()
    isBound.value = false
  }

  const refreshStatus = async (): Promise<void> => {
    if (!isNative()) return
    const plugin = await getPlugin()
    const result = await plugin.getStatus()
    status.value = result.status
    statusText.value = result.statusText
  }

  onMounted(bind)
  onUnmounted(unbind)

  // ─── Internal: delivery receipt ─────────────────────────────────────────────

  async function _printDelivery(plugin: Awaited<ReturnType<typeof getPlugin>>, order: Order) {
    await plugin.printerInit()

    // Header
    await plugin.setAlignment({ alignment: 'center' })
    await plugin.setBold({ enabled: true })
    await plugin.setFontSize({ size: 28 })
    await plugin.printText({ text: 'TOKYO SUSHI BAR\n' })
    await plugin.setFontSize({ size: 24 })
    await plugin.setBold({ enabled: false })
    await plugin.setAlignment({ alignment: 'left' })
    await plugin.printText({ text: `${SEP_THICK}\n` })
    const typeLabel = order.type === 'DELIVERY' ? 'LIVRAISON' : 'RETRAIT'
    const orderId = order.id.substring(0, 8).toUpperCase()
    await plugin.printText({ text: `${receiptDateTime(order.createdAt)}\n` })
    await plugin.printText({ text: `Cmd #${orderId}  ${typeLabel}\n` })

    // Customer
    if (order.customer) {
      await plugin.printText({ text: `${SEP}\n` })
      const fullName = `${order.customer.firstName} ${order.customer.lastName}`
      await plugin.printText({ text: `Client: ${fullName}\n` })
      if (order.customer.phoneNumber) {
        await plugin.printText({ text: `Tel: ${order.customer.phoneNumber}\n` })
      }
    }

    // Address
    if (order.address || order.displayAddress) {
      await plugin.printText({ text: `${SEP}\n` })
      if (order.address) {
        const { streetName, houseNumber, boxNumber, postcode, municipalityName } = order.address
        const box = boxNumber ? ` bte ${boxNumber}` : ''
        await plugin.printText({ text: `${streetName} ${houseNumber}${box}\n` })
        await plugin.printText({ text: `${postcode} ${municipalityName}\n` })
      } else if (order.displayAddress) {
        await plugin.printText({ text: `${order.displayAddress}\n` })
      }
      if (order.addressExtra) {
        await plugin.printText({ text: `(${order.addressExtra})\n` })
      }
    }

    // Timing
    const ready = order.estimatedReadyTime ?? order.preferredReadyTime
    if (ready) {
      await plugin.printText({ text: `${SEP}\n` })
      await plugin.printText({ text: `Prêt pour: ${receiptDateTime(ready)}\n` })
    }

    // Payment
    await plugin.printText({ text: `${SEP}\n` })
    const method = order.isOnlinePayment ? 'En ligne' : 'Espèces'
    await plugin.printText({ text: `Paiement: ${method}\n` })

    // Items
    await plugin.printText({ text: `${SEP}\n` })
    for (const item of order.items) {
      const choiceName = item.choice?.name ? ` (${item.choice.name})` : ''
      await plugin.printColumnsText({
        columns: [
          { text: `${item.quantity}x`, width: 1, align: 'left' },
          { text: `${item.product.name}${choiceName}`, width: 5, align: 'left' },
          { text: receiptPrice(item.totalPrice), width: 2, align: 'right' },
        ],
      })
    }
    await plugin.printText({ text: `${SEP}\n` })
    if (parseFloat(order.discountAmount) > 0) {
      await plugin.printColumnsText({
        columns: [
          { text: 'Réduction', width: 6, align: 'left' },
          { text: `-${receiptPrice(order.discountAmount)}`, width: 2, align: 'right' },
        ],
      })
    }
    if (order.deliveryFee && parseFloat(order.deliveryFee) > 0) {
      await plugin.printColumnsText({
        columns: [
          { text: 'Livraison', width: 6, align: 'left' },
          { text: receiptPrice(order.deliveryFee), width: 2, align: 'right' },
        ],
      })
    }
    await plugin.setBold({ enabled: true })
    await plugin.printColumnsText({
      columns: [
        { text: 'TOTAL', width: 6, align: 'left' },
        { text: receiptPrice(order.totalPrice), width: 2, align: 'right' },
      ],
    })
    await plugin.setBold({ enabled: false })

    // Extras
    if (order.orderExtra?.length) {
      await plugin.printText({ text: `${SEP}\n` })
      for (const extra of order.orderExtra) {
        if (extra.name) {
          const opts = extra.options?.length ? `: ${extra.options.join(', ')}` : ''
          await plugin.printText({ text: `+ ${extra.name}${opts}\n` })
        }
      }
    }

    // Notes
    if (order.orderNote) {
      await plugin.printText({ text: `${SEP}\n` })
      await plugin.printText({ text: `Note: ${order.orderNote}\n` })
    }

    await plugin.printText({ text: `${SEP_THICK}\n` })
    await plugin.setAlignment({ alignment: 'center' })
    await plugin.printText({ text: 'Merci et à bientôt!\n' })
    await plugin.setAlignment({ alignment: 'left' })
    await plugin.lineWrap({ lines: 3 })
  }

  // ─── Internal: kitchen receipt ───────────────────────────────────────────────

  async function _printKitchen(plugin: Awaited<ReturnType<typeof getPlugin>>, order: Order) {
    await plugin.printerInit()

    // Header
    await plugin.setAlignment({ alignment: 'center' })
    await plugin.setBold({ enabled: true })
    await plugin.setFontSize({ size: 32 })
    await plugin.printText({ text: 'CUISINE\n' })
    await plugin.setFontSize({ size: 24 })
    await plugin.setBold({ enabled: false })
    await plugin.setAlignment({ alignment: 'left' })
    await plugin.printText({ text: `${SEP_THICK}\n` })

    // Order info
    const orderId = order.id.substring(0, 8).toUpperCase()
    const typeLabel = order.type === 'DELIVERY' ? 'LIVRAISON' : 'RETRAIT'
    await plugin.printText({ text: `#${orderId}  ${typeLabel}\n` })
    await plugin.printText({ text: `${receiptDateTime(order.createdAt)}\n` })

    // Items
    await plugin.printText({ text: `${SEP}\n` })
    for (const item of order.items) {
      const choiceName = item.choice?.name ? ` (${item.choice.name})` : ''
      await plugin.setBold({ enabled: true })
      await plugin.setFontSize({ size: 28 })
      await plugin.printText({ text: `${item.quantity}x ${item.product.name}${choiceName}\n` })
      await plugin.setFontSize({ size: 24 })
      await plugin.setBold({ enabled: false })
    }

    // Extras
    if (order.orderExtra?.length) {
      await plugin.printText({ text: `${SEP}\n` })
      for (const extra of order.orderExtra) {
        if (extra.name) {
          const opts = extra.options?.length ? `: ${extra.options.join(', ')}` : ''
          await plugin.printText({ text: `+ ${extra.name}${opts}\n` })
        }
      }
    }

    // Notes
    if (order.orderNote) {
      await plugin.printText({ text: `${SEP}\n` })
      await plugin.printText({ text: `Note: ${order.orderNote}\n` })
    }

    await plugin.printText({ text: `${SEP_THICK}\n` })
    await plugin.lineWrap({ lines: 3 })
  }

  // ─── Public API ──────────────────────────────────────────────────────────────

  /** Print a full delivery receipt (customer, address, items, payment). */
  const printDelivery = async (order: Order): Promise<void> => {
    if (!isNative()) {
      if (import.meta.dev) console.warn('[SunmiPrinter] Not on a Sunmi device — delivery print skipped')
      return
    }
    const plugin = await getPlugin()
    await _printDelivery(plugin, order)
  }

  /** Print a kitchen copy (items + notes only). */
  const printKitchen = async (order: Order): Promise<void> => {
    if (!isNative()) {
      if (import.meta.dev) console.warn('[SunmiPrinter] Not on a Sunmi device — kitchen print skipped')
      return
    }
    const plugin = await getPlugin()
    await _printKitchen(plugin, order)
  }

  /** Print kitchen ticket first, then delivery ticket (500 ms apart). */
  const printBoth = async (order: Order): Promise<void> => {
    await printKitchen(order)
    // eslint-disable-next-line no-promise-executor-return
    await new Promise(resolve => setTimeout(resolve, 500))
    await printDelivery(order)
  }

  /** Print a single delivery receipt (convenience alias for use in test pages). */
  const printReceipt = (order: Order): Promise<void> => printDelivery(order)

  return {
    isBound,
    status,
    statusText,
    bind,
    unbind,
    refreshStatus,
    printDelivery,
    printKitchen,
    printBoth,
    printReceipt,
    isNative,
  }
}
