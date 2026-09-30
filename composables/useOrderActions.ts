import { computed, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useGqlMutation, useToast } from '#imports'
import gql from 'graphql-tag'
import { print } from 'graphql'
import type { Order, OrderStatus, OrderType } from '~/types'
import { formatTimeOnly, timeToRFC3339 } from '~/utils/utils'
import { useOrdersStore } from '~/stores/orders'

export type OrderActionKind = 'save' | 'advance' | 'cancel'

interface UseOrderActionsOptions {
  /** Called after a successful save / status change / cancellation (desktop: close the slideover, mobile: go back). */
  onDone?: (kind: OrderActionKind) => void
}

const UPDATE_ORDER_MUTATION = gql`
  mutation ($id: ID!, $input: UpdateOrderInput!) {
    updateOrder(id: $id, input: $input) {
      id
      status
      updatedAt
      estimatedReadyTime
    }
  }
`

const UPDATE_PAYMENT_STATUS_MUTATION = gql`
  mutation ($orderId: ID!, $status: String!) {
    updatePaymentStatus(orderId: $orderId, status: $status) {
      id
      status
    }
  }
`

// Same fields as the orders list query in pages/orders.vue
export const ORDER_BY_ID_QUERY = print(gql`
  query ($id: ID!) {
    order(id: $id) {
      id
      createdAt
      updatedAt
      status
      type
      isOnlinePayment
      couponCode
      discountAmount
      deliveryFee
      totalPrice
      preferredReadyTime
      estimatedReadyTime
      addressExtra
      orderNote
      orderExtra
      isManualAddress
      displayCustomerName
      displayAddress
      address {
        id
        streetName
        houseNumber
        boxNumber
        municipalityName
        postcode
        distance
      }
      customer {
        id
        firstName
        lastName
        phoneNumber
      }
      payment {
        status
      }
      items {
        unitPrice
        quantity
        totalPrice
        product {
          id
          code
          name
          translations {
            language
            name
          }
          category {
            id
            name
            translations {
              language
              name
            }
          }
        }
        choice {
          id
          name
        }
      }
    }
  }
`)

// Define allowed transitions based on current status and delivery option
export const getAllowedStatuses = (current: OrderStatus, deliveryOption: OrderType): OrderStatus[] => {
  let allowed: OrderStatus[] = []
  switch (current) {
    case 'PENDING':
      allowed = ['CONFIRMED', 'PREPARING']
      break
    case 'CONFIRMED':
      allowed = ['PREPARING']
      break
    case 'PREPARING':
      allowed = ['AWAITING_PICK_UP']
      break
    case 'AWAITING_PICK_UP':
      if (deliveryOption === 'DELIVERY') {
        allowed = ['OUT_FOR_DELIVERY']
      } else if (deliveryOption === 'PICKUP') {
        allowed = ['PICKED_UP', 'FAILED']
      }
      break
    case 'OUT_FOR_DELIVERY':
      allowed = ['DELIVERED', 'FAILED']
      break
    default:
      allowed = []
      break
  }
  if (current !== 'CANCELLED') {
    allowed.push('CANCELLED')
  }
  return allowed
}

// Chip tone per order status (Pili: PENDING amber, CONFIRMED cyan, PREPARING neutral, ready/done green, cancelled red)
export const ORDER_STATUS_CHIP_TONE: Record<string, 'warning' | 'danger' | 'success' | 'info' | 'neutral'> = {
  PENDING: 'warning',
  CONFIRMED: 'info',
  PREPARING: 'neutral',
  AWAITING_PICK_UP: 'success',
  OUT_FOR_DELIVERY: 'info',
  DELIVERED: 'success',
  PICKED_UP: 'success',
  CANCELLED: 'danger',
  FAILED: 'danger'
}

export const isActiveStatus = (status: OrderStatus): boolean =>
  ['PENDING', 'CONFIRMED', 'PREPARING'].includes(status)

// Whether an order has a non-cancel/non-fail next status (for quick-action button)
export const hasNextStatus = (order: Order): boolean =>
  getAllowedStatuses(order.status, order.type).some(s => s !== 'CANCELLED' && s !== 'FAILED')

/**
 * Order actions shared by the desktop slideover and the mobile detail page:
 * status transitions, estimated ready time, payment, printing and cancellation.
 */
export function useOrderActions(options: UseOrderActionsOptions = {}) {
  const { t, locale } = useI18n()
  const toast = useToast()
  const ordersStore = useOrdersStore()

  const selectedOrder = ref<Order | null>(null)
  const sliderDeltaMinutes = ref<number>(0)
  const initialSliderValue = ref<number>(0)
  const baseEstimatedTime = ref<Date | null>(null)
  const stagedStatus = ref<OrderStatus | undefined>(undefined)
  const isUpdatingPayment = ref(false)
  const quickActionLoading = ref(false)

  const { mutate: mutationUpdateOrder } = useGqlMutation<{ updateOrder: Order }>(UPDATE_ORDER_MUTATION)
  const { mutate: mutationUpdatePaymentStatus } = useGqlMutation<{ updatePaymentStatus: { id: string, status: string } }>(UPDATE_PAYMENT_STATUS_MUTATION)

  // Statuses
  const availableStatuses = computed(() => {
    if (!selectedOrder.value) return []
    return getAllowedStatuses(selectedOrder.value.status, selectedOrder.value.type)
  })

  // Primary statuses = the 1-2 most logical next actions (NOT cancel)
  const primaryStatuses = computed<OrderStatus[]>(() => {
    if (!selectedOrder.value) return []
    const allowed = getAllowedStatuses(selectedOrder.value.status, selectedOrder.value.type)
    return allowed.filter(s => s !== 'CANCELLED' && s !== 'FAILED')
  })

  // Secondary statuses = everything else (cancel, failed, edge cases)
  const secondaryStatuses = computed<OrderStatus[]>(() => {
    if (!selectedOrder.value) return []
    const allowed = getAllowedStatuses(selectedOrder.value.status, selectedOrder.value.type)
    return allowed.filter(s => s === 'CANCELLED' || s === 'FAILED')
  })

  const handleStatusButton = (newStatus: OrderStatus) => {
    if (stagedStatus.value === newStatus) {
      stagedStatus.value = undefined
    } else {
      stagedStatus.value = newStatus
    }
  }

  // Time management
  const initTime = (order: Order) => {
    try {
      const currentNow = new Date()

      if (order.status === 'PENDING') {
        baseEstimatedTime.value = currentNow
        sliderDeltaMinutes.value = 30
        initialSliderValue.value = 0
      } else if (order.estimatedReadyTime) {
        const estimatedDate = new Date(order.estimatedReadyTime)

        if (isNaN(estimatedDate.getTime())) {
          throw new Error('Invalid date format')
        }

        baseEstimatedTime.value = estimatedDate
        const diffMs = estimatedDate.getTime() - currentNow.getTime()
        const diffMinutes = Math.max(0, Math.round(diffMs / 60000))
        const roundedMinutes = Math.round(diffMinutes / 5) * 5
        sliderDeltaMinutes.value = roundedMinutes
        initialSliderValue.value = roundedMinutes
      } else {
        baseEstimatedTime.value = currentNow
        sliderDeltaMinutes.value = 0
        initialSliderValue.value = 0
      }
    } catch (e) {
      if (import.meta.dev) console.error('Error initializing time:', e)
      baseEstimatedTime.value = new Date()
      sliderDeltaMinutes.value = 0
      initialSliderValue.value = 0
    }
  }

  // Select an order: reset the staged status and initialise the time controls
  const selectOrder = (order: Order) => {
    ordersStore.acknowledgeOrder(order.id)
    selectedOrder.value = order
    stagedStatus.value = undefined
    initTime(order)
  }

  const newEstimatedTime = computed(() => {
    if (!baseEstimatedTime.value) return ''
    const adjustment = sliderDeltaMinutes.value - initialSliderValue.value
    const newTime = new Date(baseEstimatedTime.value.getTime() + adjustment * 60000)
    return formatTimeOnly(newTime.toISOString(), locale.value)
  })

  const canSave = computed(() =>
    stagedStatus.value || sliderDeltaMinutes.value !== initialSliderValue.value
  )

  // Estimated ready time to send with a mutation, when the delta was changed
  const pendingEstimatedReadyTime = (): string | undefined => {
    if (baseEstimatedTime.value && sliderDeltaMinutes.value !== initialSliderValue.value) {
      const adjustment = sliderDeltaMinutes.value - initialSliderValue.value
      const newTime = new Date(baseEstimatedTime.value.getTime() + adjustment * 60000)
      return timeToRFC3339(formatTimeOnly(newTime.toISOString(), locale.value))
    }
    return undefined
  }

  // Quick status advance from slideover primary buttons (immediate save)
  const quickStatusAdvance = async (newStatus: OrderStatus) => {
    if (!selectedOrder.value || quickActionLoading.value) return

    if (newStatus === 'CANCELLED') {
      openCancelDialog()
      return
    }

    quickActionLoading.value = true

    // Also send time estimation if changed
    const estimatedReadyTime = pendingEstimatedReadyTime()

    try {
      const res = await mutationUpdateOrder({
        id: selectedOrder.value.id,
        input: { status: newStatus, estimatedReadyTime }
      })
      ordersStore.updateOrder(res.updateOrder)
      options.onDone?.('advance')
      toast.add({ title: t('orders.statusAdvanced'), color: 'success' })
    } catch {
      toast.add({ title: t('orders.errors.updateFailed'), color: 'error' })
    } finally {
      quickActionLoading.value = false
    }
  }

  // Quick advance from card list (one-tap, picks best next status)
  const quickAdvanceStatus = async (order: Order) => {
    const allowed = getAllowedStatuses(order.status, order.type)
    const target = allowed.find(s => s !== 'CANCELLED' && s !== 'FAILED')
    if (!target) return

    const previousStatus = order.status
    const previousUpdatedAt = order.updatedAt

    // Optimistic update
    ordersStore.updateOrder({ id: order.id, status: target, updatedAt: new Date().toISOString() })

    try {
      const res = await mutationUpdateOrder({ id: order.id, input: { status: target } })
      ordersStore.updateOrder(res.updateOrder)
      toast.add({ title: t('orders.statusAdvanced'), color: 'success' })
    } catch {
      ordersStore.updateOrder({ id: order.id, status: previousStatus, updatedAt: previousUpdatedAt })
      toast.add({ title: t('orders.errors.updateFailed'), color: 'error' })
    }
  }

  // Optimistic status change from a kanban drop
  const dropOrderStatus = async (order: Order, targetStatus: OrderStatus) => {
    const previousStatus = order.status
    const previousUpdatedAt = order.updatedAt

    // Optimistic update (include updatedAt for COMPLETED column date filter)
    ordersStore.updateOrder({ id: order.id, status: targetStatus, updatedAt: new Date().toISOString() })

    try {
      const res = await mutationUpdateOrder({
        id: order.id,
        input: { status: targetStatus }
      })
      // Apply server response (authoritative updatedAt)
      ordersStore.updateOrder(res.updateOrder)
    } catch {
      // Revert on failure
      ordersStore.updateOrder({ id: order.id, status: previousStatus, updatedAt: previousUpdatedAt })
      toast.add({ title: t('orders.errors.updateFailed'), color: 'error' })
    }
  }

  const updateOrder = async (newStatus?: OrderStatus) => {
    if (!selectedOrder.value) return

    if (newStatus === 'CANCELLED') {
      openCancelDialog()
      return
    }

    const status = newStatus
    const estimatedReadyTime = pendingEstimatedReadyTime()

    try {
      const res = await mutationUpdateOrder({
        id: selectedOrder.value.id,
        input: {
          status,
          estimatedReadyTime
        }
      })

      ordersStore.updateOrder(res.updateOrder)
      options.onDone?.('save')
    } catch (error) {
      if (import.meta.dev) console.error('Update failed:', error)
      toast.add({ title: t('orders.errors.updateFailed'), color: 'error' })
    }
  }

  // Mark payment as paid
  const markAsPaid = async () => {
    if (!selectedOrder.value) return

    isUpdatingPayment.value = true

    try {
      const res = await mutationUpdatePaymentStatus({
        orderId: selectedOrder.value.id,
        status: 'paid'
      })

      if (selectedOrder.value.payment) {
        selectedOrder.value.payment.status = res.updatePaymentStatus.status
      }

      ordersStore.updateOrder({
        id: selectedOrder.value.id,
        payment: selectedOrder.value.payment
          ? { ...selectedOrder.value.payment, status: res.updatePaymentStatus.status }
          : null
      })
    } catch (error) {
      if (import.meta.dev) console.error('Failed to update payment status:', error)
      toast.add({ title: t('orders.errors.paymentUpdateFailed'), color: 'error' })
    } finally {
      isUpdatingPayment.value = false
    }
  }

  // Cancellation dialog state
  const showCancelDialog = ref(false)
  const cancelDelay = ref(5)
  const confirmDisabled = computed(() => cancelDelay.value > 0)
  let cancelTimer: number | undefined = undefined

  const openCancelDialog = () => {
    cancelDelay.value = 3
    showCancelDialog.value = true
    cancelTimer = window.setInterval(() => {
      if (cancelDelay.value > 0) {
        cancelDelay.value -= 1
      } else {
        clearInterval(cancelTimer)
        cancelTimer = undefined
      }
    }, 1000)
  }

  const confirmCancellation = async () => {
    if (!selectedOrder.value) return
    try {
      const res = await mutationUpdateOrder({
        id: selectedOrder.value.id,
        input: { status: 'CANCELLED' as OrderStatus }
      })
      ordersStore.updateOrder(res.updateOrder)
      showCancelDialog.value = false
      options.onDone?.('cancel')
      toast.add({ title: t('orders.statusAdvanced'), color: 'success' })
    } catch {
      toast.add({ title: t('orders.errors.updateFailed'), color: 'error' })
    }
  }

  const cancelCancellation = () => {
    showCancelDialog.value = false
    if (cancelTimer) {
      clearInterval(cancelTimer)
      cancelTimer = undefined
    }
  }

  // Printing
  const { printDelivery: sunmiPrintDelivery, printKitchen: sunmiPrintKitchen } = useSunmiPrinter()

  const printDelivery = async () => {
    if (!selectedOrder.value) return
    try {
      await sunmiPrintDelivery(selectedOrder.value)
    } catch (error) {
      if (import.meta.dev) console.error('Print failed:', error)
      toast.add({ title: t('orders.errors.printFailed'), color: 'error' })
    }
  }

  const printKitchen = async () => {
    if (!selectedOrder.value) return
    try {
      await sunmiPrintKitchen(selectedOrder.value)
    } catch (error) {
      if (import.meta.dev) console.error('Kitchen print failed:', error)
      toast.add({ title: t('orders.errors.printFailed'), color: 'error' })
    }
  }

  // Two-step print flow: kitchen, confirm, then client. Required on devices
  // without an auto-cutter (Sunmi V3H) so the operator can tear the kitchen
  // ticket before the client ticket prints and the two sheets are not stuck
  // together.
  const showPrintContinueDialog = ref(false)
  const printContinueOrderId = ref<string | null>(null)

  const printBoth = async () => {
    if (!selectedOrder.value) return
    try {
      await sunmiPrintKitchen(selectedOrder.value)
      printContinueOrderId.value = selectedOrder.value.id
      showPrintContinueDialog.value = true
    } catch (error) {
      if (import.meta.dev) console.error('Kitchen print failed:', error)
      toast.add({ title: t('orders.errors.printFailed'), color: 'error' })
    }
  }

  const continueToClientPrint = async () => {
    showPrintContinueDialog.value = false
    const orderId = printContinueOrderId.value
    printContinueOrderId.value = null
    if (!orderId) return
    const order = ordersStore.orders.find(o => o.id === orderId) ?? selectedOrder.value
    if (!order) return
    try {
      await sunmiPrintDelivery(order)
    } catch (error) {
      if (import.meta.dev) console.error('Client print failed:', error)
      toast.add({ title: t('orders.errors.printFailed'), color: 'error' })
    }
  }

  const cancelContinueClientPrint = () => {
    showPrintContinueDialog.value = false
    printContinueOrderId.value = null
  }

  // Print menu items (desktop dropdown and mobile sheet)
  const printMenuItems = computed(() => [[
    {
      label: t('orders.print.both'),
      icon: 'i-lucide-printer',
      click: () => printBoth()
    },
    {
      label: t('orders.print.delivery'),
      icon: 'i-lucide-truck',
      click: () => printDelivery()
    },
    {
      label: t('orders.print.kitchen'),
      icon: 'i-lucide-chef-hat',
      click: () => printKitchen()
    }
  ]])

  onUnmounted(() => {
    if (cancelTimer) {
      clearInterval(cancelTimer)
      cancelTimer = undefined
    }
  })

  return {
    selectedOrder,
    sliderDeltaMinutes,
    initialSliderValue,
    baseEstimatedTime,
    stagedStatus,
    isUpdatingPayment,
    quickActionLoading,
    availableStatuses,
    primaryStatuses,
    secondaryStatuses,
    handleStatusButton,
    initTime,
    selectOrder,
    newEstimatedTime,
    canSave,
    quickStatusAdvance,
    quickAdvanceStatus,
    dropOrderStatus,
    updateOrder,
    markAsPaid,
    showCancelDialog,
    cancelDelay,
    confirmDisabled,
    openCancelDialog,
    confirmCancellation,
    cancelCancellation,
    printDelivery,
    printKitchen,
    printBoth,
    showPrintContinueDialog,
    continueToClientPrint,
    cancelContinueClientPrint,
    printMenuItems
  }
}
