import { onMounted, onUnmounted, ref } from 'vue'
import type { Order, ProductCategory } from '~/types'
import { SunmiPrinter } from '~/plugins/capacitor-sunmi-printer/src/index'
import { usePlatform } from '~/composables/usePlatform'
import { hasText } from '~/utils/guards'
import { formatCentsReceipt, parseCents, sumCents, toCents } from '~/utils/money'

// ─── Receipt formatting helpers ────────────────────────────────────────────────

/** What a receipt shows for an amount that cannot be read: obviously unknown, never "NaN €" or a made-up 0,00 €. */
const UNKNOWN_PRICE = '--,--\u00a0€'

/**
 * Receipt price, same format as the POS: "20.50" → "20,50 €" (comma, non-breaking space). An amount that is not a
 * number prints as `--,-- €` and is logged: the order data is wrong, and a wrong price on a receipt must be visible.
 */
function receiptPrice(price: string | number | null | undefined): string {
  const cents = parseCents(price)
  if (cents === null) {
    console.error('[SunmiPrinter] Unreadable price on a receipt:', price)
    return UNKNOWN_PRICE
  }
  return formatCentsReceipt(cents)
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

/** Build a `***** [Category Name] *****` line padded to ~32 chars. */
function categoryBanner(name: string): string {
  const label = `[${name}]`
  const remaining = Math.max(0, 32 - label.length)
  const leftStars = '*'.repeat(Math.floor(remaining / 2))
  const rightStars = '*'.repeat(Math.ceil(remaining / 2))
  return `${leftStars}${label}${rightStars}`
}

/**
 * Return the French name for a translatable object. Falls back to the default
 * `name` if no French translation is stored (e.g. legacy data).
 */
function frName(obj: {
  name: string
  translations?: { language: string; name: string }[]
}): string {
  const fr = obj.translations?.find((t) => t.language === 'fr')?.name
  const trimmed = fr?.trim()
  return hasText(trimmed) ? trimmed : obj.name
}

/** The category of a product, which orders pushed by the live subscription may lack. */
const categoryOf = (product: { category?: ProductCategory | null }) => product.category

/** Group order items by their product category (French name, insertion order). */
function groupItemsByCategory(items: Order['items']) {
  const groups = new Map<string, Order['items']>()
  for (const item of items) {
    const category = categoryOf(item.product)
    const cat = category ? frName(category) : 'Autres'
    const bucket = groups.get(cat) ?? []
    bucket.push(item)
    groups.set(cat, bucket)
  }
  return groups
}

/** Short human-readable order code (last 5 chars of UUID, uppercase). */
function shortOrderCode(id: string): string {
  return id.replace(/-/gu, '').slice(-5).toUpperCase()
}

// ─── Composable ────────────────────────────────────────────────────────────────

export const useSunmiPrinter = () => {
  const isBound = ref(false)
  const status = ref<number | null>(null)
  const statusText = ref<string>('')

  // Receipt header: restaurant name (white-label), uppercased for the ticket.
  const restaurantName = (useRuntimeConfig().public.restaurantName as string).toUpperCase()

  const { isCapacitor } = usePlatform()

  /** True only when running inside Capacitor on an Android device. */
  const isNative = (): boolean => isCapacitor

  // Static import — returning the Capacitor Proxy from an async function makes
  // `await` treat it as thenable (the Proxy intercepts `.then` as a plugin
  // Method call, which fails with "not implemented on android").
  const getPlugin = () => SunmiPrinter

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  const bind = async (): Promise<void> => {
    if (!isNative()) return
    const plugin = getPlugin()
    await plugin.bindService()
    isBound.value = true
    const result = await plugin.getStatus()
    status.value = result.status
    statusText.value = result.statusText
  }

  const unbind = async (): Promise<void> => {
    if (!isNative() || !isBound.value) return
    const plugin = getPlugin()
    await plugin.unbindService()
    isBound.value = false
  }

  const refreshStatus = async (): Promise<void> => {
    if (!isNative()) return
    const plugin = getPlugin()
    const result = await plugin.getStatus()
    status.value = result.status
    statusText.value = result.statusText
  }

  onMounted(bind)
  onUnmounted(unbind)

  // ─── Internal: delivery receipt ─────────────────────────────────────────────

  async function printDeliveryReceipt(plugin: ReturnType<typeof getPlugin>, order: Order) {
    await plugin.printerInit()

    // Header
    await plugin.setAlignment({ alignment: 'center' })
    await plugin.setBold({ enabled: true })
    await plugin.setFontSize({ size: 28 })
    await plugin.printText({ text: `${restaurantName}\n` })
    await plugin.setFontSize({ size: 24 })
    const typeLabel = order.type === 'DELIVERY' ? 'LIVRAISON' : 'À EMPORTER'
    await plugin.printText({ text: `${typeLabel}\n` })
    await plugin.printText({ text: `** ${shortOrderCode(order.id)} **\n` })
    await plugin.setBold({ enabled: false })
    await plugin.setAlignment({ alignment: 'left' })
    await plugin.printText({ text: `\n${SEP_THICK}\n` })

    // Meta
    await plugin.printText({ text: `Le: ${receiptDateTime(order.createdAt)}\n` })
    const ready = order.estimatedReadyTime ?? order.preferredReadyTime
    await plugin.printText({ text: `Prêt: ${hasText(ready) ? receiptDateTime(ready) : 'ASAP'}\n` })

    // Customer
    if (order.customer) {
      await plugin.printText({ text: `\n${SEP}\n` })
      const fullName = `${order.customer.firstName} ${order.customer.lastName}`
      await plugin.printText({ text: `${fullName}\n` })
      if (hasText(order.customer.phoneNumber)) {
        await plugin.printText({ text: `${order.customer.phoneNumber}\n` })
      }
    }

    // Address
    const { address } = order
    if (address || hasText(order.displayAddress)) {
      await plugin.printText({ text: `\n${SEP}\n` })
      if (address) {
        const { streetName, houseNumber, boxNumber, postcode, municipalityName } = address
        const box = hasText(boxNumber) ? ` bte ${boxNumber}` : ''
        await plugin.printText({ text: `${streetName} ${houseNumber}${box}\n` })
        await plugin.printText({ text: `${postcode} ${municipalityName}\n` })
      } else {
        await plugin.printText({ text: `${order.displayAddress}\n` })
      }
      if (hasText(order.addressExtra)) {
        await plugin.printText({ text: `(${order.addressExtra})\n` })
      }
    }

    // Items — grouped by category, with product code + plain-text header.
    // (printColumnsText with a 4/20/8 layout can wrap on 58mm depending on
    //  Font width; hand-padded printText is predictable.)
    await plugin.printText({ text: `\n${SEP}\n` })
    await plugin.printText({ text: 'Qte Article              Prix\n' })
    for (const [catName, items] of groupItemsByCategory(order.items)) {
      await plugin.printText({ text: `\n${categoryBanner(catName)}\n` })
      for (const item of items) {
        const code = hasText(item.product.code) ? `${item.product.code}. ` : ''
        const choiceName = hasText(item.choice?.name) ? ` (${item.choice.name})` : ''
        // Sunmi 58mm paper = 32 chars. Use 3 + 18 + 9 = 30 with 2-char safety.
        await plugin.printColumnsText({
          columns: [
            { text: `${item.quantity}x`, width: 3, align: 'left' },
            { text: `${code}${frName(item.product)}${choiceName}`, width: 18, align: 'left' },
            { text: receiptPrice(item.totalPrice), width: 9, align: 'right' },
          ],
        })
      }
    }

    // Totals
    await plugin.printText({ text: `\n${SEP}\n` })
    // Integer cents: float sums of decimal strings drift (0.1 + 0.2). One unreadable line makes the subtotal unknown.
    const itemsTotal = sumCents(order.items.map((it) => it.totalPrice))
    await plugin.printColumnsText({
      columns: [
        { text: 'Sous-total', width: 21, align: 'left' },
        {
          text: itemsTotal === null ? receiptPrice(null) : formatCentsReceipt(itemsTotal),
          width: 9,
          align: 'right',
        },
      ],
    })
    if (toCents(order.discountAmount) > 0) {
      await plugin.printColumnsText({
        columns: [
          { text: 'Réduction', width: 21, align: 'left' },
          { text: `-${receiptPrice(order.discountAmount)}`, width: 9, align: 'right' },
        ],
      })
    }
    if (toCents(order.deliveryFee) > 0) {
      await plugin.printColumnsText({
        columns: [
          { text: 'Livraison', width: 21, align: 'left' },
          { text: receiptPrice(order.deliveryFee), width: 9, align: 'right' },
        ],
      })
    }
    await plugin.setBold({ enabled: true })
    await plugin.printColumnsText({
      columns: [
        { text: 'TOTAL', width: 21, align: 'left' },
        { text: receiptPrice(order.totalPrice), width: 9, align: 'right' },
      ],
    })
    await plugin.setBold({ enabled: false })

    // Payment banner
    await plugin.printText({ text: `\n${SEP}\n` })
    await plugin.setAlignment({ alignment: 'center' })
    await plugin.setBold({ enabled: true })
    if (order.isOnlinePayment) {
      await plugin.printText({ text: 'EN LIGNE — PAYÉ\n' })
    } else {
      await plugin.printText({ text: 'ESPÈCES\n' })
    }
    await plugin.setBold({ enabled: false })
    await plugin.setAlignment({ alignment: 'left' })

    // Extras
    const extras = order.orderExtra ?? []
    if (extras.length > 0) {
      await plugin.printText({ text: `\n${SEP}\n` })
      for (const extra of extras) {
        if (hasText(extra.name)) {
          const options = extra.options ?? []
          const opts = options.length > 0 ? `: ${options.join(', ')}` : ''
          await plugin.printText({ text: `+ ${extra.name}${opts}\n` })
        }
      }
    }

    // Notes
    if (hasText(order.orderNote)) {
      await plugin.printText({ text: `\n${SEP}\n` })
      await plugin.printText({ text: `Note: ${order.orderNote}\n` })
    }

    // Footer
    await plugin.printText({ text: `\n${SEP_THICK}\n` })
    await plugin.setAlignment({ alignment: 'center' })
    await plugin.printText({ text: 'Merci pour votre commande\n' })
    await plugin.setAlignment({ alignment: 'left' })
    await plugin.lineWrap({ lines: 4 })
  }

  // ─── Internal: kitchen receipt ───────────────────────────────────────────────

  async function printKitchenReceipt(plugin: ReturnType<typeof getPlugin>, order: Order) {
    await plugin.printerInit()

    // Header
    await plugin.setAlignment({ alignment: 'center' })
    await plugin.setBold({ enabled: true })
    await plugin.setFontSize({ size: 32 })
    await plugin.printText({ text: 'CUISINE\n' })
    await plugin.setFontSize({ size: 24 })
    const typeLabel = order.type === 'DELIVERY' ? 'LIVRAISON' : 'À EMPORTER'
    await plugin.printText({ text: `${typeLabel}\n` })
    await plugin.printText({ text: `** ${shortOrderCode(order.id)} **\n` })
    await plugin.setBold({ enabled: false })
    await plugin.setAlignment({ alignment: 'left' })
    await plugin.printText({ text: `\n${SEP_THICK}\n` })

    // Order meta + customer context
    await plugin.printText({ text: `Le: ${receiptDateTime(order.createdAt)}\n` })
    const ready = order.estimatedReadyTime ?? order.preferredReadyTime
    await plugin.printText({ text: `Prêt: ${hasText(ready) ? receiptDateTime(ready) : 'ASAP'}\n` })
    if (order.customer) {
      const fullName = `${order.customer.firstName} ${order.customer.lastName}`
      await plugin.printText({ text: `${fullName}\n` })
      if (hasText(order.customer.phoneNumber)) {
        await plugin.printText({ text: `${order.customer.phoneNumber}\n` })
      }
    }

    // Items — grouped by category, bold + large font, with product code
    await plugin.printText({ text: `\n${SEP}\n` })
    await plugin.printText({ text: 'Qte Article\n' })
    for (const [catName, items] of groupItemsByCategory(order.items)) {
      await plugin.printText({ text: `\n${categoryBanner(catName)}\n` })
      for (const item of items) {
        const code = hasText(item.product.code) ? `${item.product.code}. ` : ''
        const choiceName = hasText(item.choice?.name) ? ` (${item.choice.name})` : ''
        await plugin.setBold({ enabled: true })
        await plugin.setFontSize({ size: 28 })
        await plugin.printText({
          text: `${item.quantity}x ${code}${frName(item.product)}${choiceName}\n`,
        })
        await plugin.setFontSize({ size: 24 })
        await plugin.setBold({ enabled: false })
      }
    }

    // Extras
    const extras = order.orderExtra ?? []
    if (extras.length > 0) {
      await plugin.printText({ text: `\n${SEP}\n` })
      for (const extra of extras) {
        if (hasText(extra.name)) {
          const options = extra.options ?? []
          const opts = options.length > 0 ? `: ${options.join(', ')}` : ''
          await plugin.printText({ text: `+ ${extra.name}${opts}\n` })
        }
      }
    }

    // Notes
    if (hasText(order.orderNote)) {
      await plugin.printText({ text: `\n${SEP}\n` })
      await plugin.printText({ text: `Note: ${order.orderNote}\n` })
    }

    await plugin.printText({ text: `\n${SEP_THICK}\n` })
    await plugin.lineWrap({ lines: 4 })
  }

  // ─── Public API ──────────────────────────────────────────────────────────────

  /** Print a full delivery receipt (customer, address, items, payment). */
  const printDelivery = async (order: Order): Promise<void> => {
    if (!isNative()) {
      if (import.meta.dev)
        console.warn('[SunmiPrinter] Not on a Sunmi device — delivery print skipped')
      return
    }
    const plugin = getPlugin()
    await printDeliveryReceipt(plugin, order)
  }

  /** Print a kitchen copy (items + notes only). */
  const printKitchen = async (order: Order): Promise<void> => {
    if (!isNative()) {
      if (import.meta.dev)
        console.warn('[SunmiPrinter] Not on a Sunmi device — kitchen print skipped')
      return
    }
    const plugin = getPlugin()
    await printKitchenReceipt(plugin, order)
  }

  /**
   * DEPRECATED for V3H (no auto-cutter) — prefer calling `printKitchen`
   * and `printDelivery` with a user confirmation between them so the
   * operator can tear the kitchen ticket before the delivery ticket
   * prints. Kept for devices with a real auto-cutter.
   */
  const printBoth = async (order: Order): Promise<void> => {
    await printKitchen(order)
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
