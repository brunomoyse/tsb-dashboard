<template>
  <div class="p-4 sm:p-6">
    <!-- Page Header -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-highlighted">{{ t('navigation.orders') }}</h1>
      <p class="text-muted">{{ t('orders.subtitle') }}</p>
    </div>

    <!-- Filter Tabs -->
    <UTabs
      v-model="selectedTab"
      :items="tabItems"
      :content="false"
      class="mb-6"
    />

    <!-- Orders Grid -->
    <div v-if="filteredOrders.length" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <UCard
        v-for="order in filteredOrders"
        :key="order.id"
        :class="[
          'cursor-pointer hover:shadow-lg transition-shadow',
          order.status === 'PENDING' ? 'border-l-4 border-l-warning bg-warning/5' : ''
        ]"
        @click="openOrderDetails(order)"
      >
        <!-- Card Header -->
        <template #header>
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-lg font-bold">{{ order.customer?.firstName }} {{ order.customer?.lastName }}</h3>
              <p class="text-sm text-muted">{{ formatDate(order.createdAt) }}</p>
            </div>
            <UBadge :color="getStatusColor(order.status)" variant="soft">
              {{ t(`orders.status.${order.status?.toLowerCase()}`) }}
            </UBadge>
          </div>
        </template>

        <!-- Card Body -->
        <div class="space-y-4">
          <!-- Order Type & Payment Badges -->
          <div class="flex flex-wrap gap-2">
            <UBadge color="neutral" variant="subtle" size="sm">
              <UIcon
                :name="order.isOnlinePayment ? 'i-lucide-credit-card' : 'i-lucide-banknote'"
                class="mr-1"
              />
              {{ order.isOnlinePayment ? t('orders.paymentMethod.online') : t('orders.paymentMethod.cash') }}
            </UBadge>
            <UBadge color="neutral" variant="subtle" size="sm">
              <UIcon
                :name="order.type === 'DELIVERY' ? 'i-lucide-bike' : 'i-lucide-shopping-bag'"
                class="mr-1"
              />
              {{ t(`orders.deliveryOption.${order.type?.toLowerCase()}`) }}
            </UBadge>
            <UBadge
              :color="getPaymentStatusColor(order.payment?.status)"
              variant="soft"
              size="sm"
            >
              {{ t(`orders.payment.status.${order.payment?.status ? order.payment.status.toLowerCase() : 'notPaid'}`) }}
            </UBadge>
          </div>

          <!-- Customer Info -->
          <div>
            <p class="text-sm text-muted flex items-center gap-1">
              <UIcon name="i-lucide-phone" class="size-4" />
              {{ order.customer?.phoneNumber }}
            </p>
            <p v-if="order.type === 'DELIVERY'" class="text-sm text-muted flex items-center gap-1">
              <UIcon name="i-lucide-map-pin" class="size-4" />
              {{ getStreetAndDistance(order.address) }}
            </p>
            <p v-else class="text-sm text-muted">{{ t('orders.pickup') }}</p>
          </div>

          <!-- Order Items -->
          <div class="border-t pt-3 space-y-1">
            <p class="text-sm font-medium">{{ t('orders.items') }}:</p>
            <div v-for="item in order.items" :key="item.product.id" class="flex justify-between text-sm">
              <span>{{ item.quantity }}x {{ item.product.code || item.product.name }}</span>
              <span>{{ formatPrice(item.totalPrice) }}</span>
            </div>
          </div>

          <!-- Total -->
          <div class="border-t pt-3 flex justify-between font-bold">
            <span>Total</span>
            <span>{{ formatPrice(order.totalPrice) }}</span>
          </div>

          <!-- Time Info -->
          <div v-if="order.estimatedReadyTime" class="text-sm flex items-center gap-1 text-muted">
            <UIcon name="i-lucide-clock" class="size-4" />
            {{ t('orders.estimatedTime') }}: {{ formatTimeOnly(order.estimatedReadyTime) }}
          </div>
        </div>
      </UCard>
    </div>

    <!-- Empty State -->
    <UCard v-else class="text-center py-12">
      <UIcon name="i-lucide-package-x" class="size-16 mx-auto mb-4 text-muted" />
      <p class="text-lg text-muted">{{ t('orders.noOrders') }}</p>
    </UCard>

    <!-- Order Details Slideover -->
    <USlideover
      v-model:open="showOrderDetails"
      :title="t('orders.orderDetails')"
      :ui="{ content: 'min-h-full' }"
    >
      <template v-if="selectedOrder" #body>
        <div class="space-y-6">
          <!-- Order Header -->
          <div class="pb-4 border-b border-default">
            <div class="flex items-start justify-between mb-3">
              <div class="flex-1">
                <h2 class="text-xl font-bold text-highlighted">
                  {{ selectedOrder.customer?.firstName }} {{ selectedOrder.customer?.lastName }}
                </h2>
                <p class="text-sm text-muted">{{ formatDate(selectedOrder.createdAt) }}</p>
              </div>
              <UButton
                icon="i-lucide-printer"
                :label="t('common.print')"
                color="neutral"
                variant="outline"
                @click="printReceipt"
              />
            </div>

            <div class="flex flex-wrap gap-2 mb-3">
              <UBadge :color="getStatusColor(selectedOrder.status)" variant="soft">
                {{ t(`orders.status.${selectedOrder.status?.toLowerCase()}`) }}
              </UBadge>
              <UBadge color="neutral" variant="subtle" size="sm">
                <UIcon
                  :name="selectedOrder.isOnlinePayment ? 'i-lucide-credit-card' : 'i-lucide-banknote'"
                  class="mr-1"
                />
                {{ selectedOrder.isOnlinePayment ? t('orders.paymentMethod.online') : t('orders.paymentMethod.cash') }}
              </UBadge>
              <UBadge color="neutral" variant="subtle" size="sm">
                <UIcon
                  :name="selectedOrder.type === 'DELIVERY' ? 'i-lucide-bike' : 'i-lucide-shopping-bag'"
                  class="mr-1"
                />
                {{ t(`orders.deliveryOption.${selectedOrder.type?.toLowerCase()}`) }}
              </UBadge>
            </div>

            <div class="text-sm space-y-1">
              <p class="flex items-center gap-1 text-muted">
                <UIcon name="i-lucide-phone" class="size-4" />
                {{ selectedOrder.customer?.phoneNumber }}
              </p>
              <p v-if="selectedOrder.type === 'DELIVERY'" class="flex items-center gap-1 text-muted">
                <UIcon name="i-lucide-map-pin" class="size-4" />
                {{ getStreetAndDistance(selectedOrder.address) }}
              </p>
            </div>
          </div>

          <!-- Time Management Section -->
          <div>
            <h3 class="text-sm font-medium mb-2">{{ t('orders.timeManagement') }}</h3>
            <p class="text-sm text-muted mb-4">
              {{ t('orders.preferredTime') }}:
              {{ selectedOrder.preferredReadyTime ? formatTimeOnly(selectedOrder.preferredReadyTime) : t('orders.asap') }}
            </p>

            <div v-if="selectedOrder.estimatedReadyTime" class="mb-4">
              <p class="text-sm text-muted">
                {{ t('orders.currentEstimate') }}:
                <span class="font-bold">{{ formatTimeOnly(selectedOrder.estimatedReadyTime) }}</span>
              </p>
            </div>

            <!-- Quick Time Buttons -->
            <div class="grid grid-cols-4 gap-2 mb-4">
              <UButton
                v-for="minutes in [15, 30, 45, 60]"
                :key="minutes"
                :variant="sliderDeltaMinutes === minutes ? 'solid' : 'outline'"
                :color="sliderDeltaMinutes === minutes ? 'primary' : 'neutral'"
                @click="sliderDeltaMinutes = minutes"
              >
                +{{ minutes }}min
              </UButton>
            </div>

            <!-- Time Slider -->
            <USlider
              v-model="sliderDeltaMinutes"
              :min="0"
              :max="90"
              :step="5"
              class="mb-4"
            />

            <p class="text-sm">
              {{ t('orders.newEstimate') }}:
              <span class="font-bold text-primary">{{ newEstimatedTime }}</span>
            </p>
          </div>

          <!-- Payment Status Section -->
          <div>
            <h3 class="text-sm font-medium mb-2">{{ t('orders.payment.title') }}</h3>
            <UCard
              :ui="{
                body: 'p-4 flex items-center gap-3',
                background: `bg-${getPaymentStatusColor(selectedOrder.payment?.status)}/10`
              }"
            >
              <UIcon
                :name="selectedOrder.payment?.status?.toLowerCase() === 'paid' ? 'i-lucide-circle-check' : 'i-lucide-clock'"
                :class="`size-8 text-${getPaymentStatusColor(selectedOrder.payment?.status)}`"
              />
              <div class="flex-1">
                <p class="font-medium">
                  {{ t(`orders.payment.status.${selectedOrder.payment?.status ? selectedOrder.payment.status.toLowerCase() : 'notPaid'}`) }}
                </p>
                <p class="text-sm text-muted">
                  {{ selectedOrder.isOnlinePayment ? t('orders.paymentMethod.online') : t('orders.paymentMethod.cash') }}
                </p>
              </div>
            </UCard>

            <UButton
              v-if="selectedOrder.payment?.status?.toLowerCase() !== 'paid'"
              color="success"
              block
              class="mt-4"
              :loading="isUpdatingPayment"
              @click="markAsPaid"
            >
              <UIcon name="i-lucide-check-circle" class="mr-2" />
              {{ t('orders.payment.markAsPaid') }}
            </UButton>
          </div>

          <!-- Status Update Section -->
          <div>
            <h3 class="text-sm font-medium mb-2">{{ t('orders.updateStatus') }}</h3>
            <div class="space-y-2">
              <UButton
                v-for="status in availableStatuses"
                :key="status"
                :variant="stagedStatus === status ? 'solid' : 'outline'"
                :color="stagedStatus === status ? getStatusColor(status) : 'neutral'"
                block
                @click="handleStatusButton(status)"
              >
                <UIcon :name="getStatusIcon(status)" class="mr-2" />
                {{ t(`orders.status.${status.toLowerCase()}`) }}
              </UButton>
            </div>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex gap-2">
          <UButton
            color="neutral"
            variant="outline"
            block
            @click="showOrderDetails = false"
          >
            {{ t('common.cancel') }}
          </UButton>
          <UButton
            :disabled="!canSave"
            block
            @click="updateOrder(stagedStatus)"
          >
            <UIcon name="i-lucide-save" class="mr-2" />
            {{ t('common.save') }}
          </UButton>
        </div>
      </template>
    </USlideover>

    <!-- Confirmation Dialog for Cancellation -->
    <UModal
      v-model:open="showCancelDialog"
      :ui="{ footer: 'flex justify-end gap-2' }"
    >
      <template #header>
        <h3 class="font-bold">{{ t('orders.confirmCancelTitle') }}</h3>
      </template>

      <template #body>
        <div class="space-y-3">
          <p>{{ t('orders.confirmCancelMessage') }}</p>
          <p v-if="selectedOrder" class="text-sm text-muted">
            {{ formatDate(selectedOrder.createdAt) }} - {{ formatOrderSummary(selectedOrder) }}
          </p>
          <p v-if="selectedOrder?.isOnlinePayment" class="text-error">
            {{ t('orders.refundNotice') }}
          </p>
          <p v-if="confirmDisabled" class="text-sm">
            {{ t('orders.waitMessage', { seconds: cancelDelay }) }}
          </p>
        </div>
      </template>

      <template #footer>
        <UButton
          color="neutral"
          variant="outline"
          @click="cancelCancellation"
        >
          {{ t('orders.back') }}
        </UButton>
        <UButton
          color="error"
          :disabled="confirmDisabled"
          @click="confirmCancellation"
        >
          {{ t('orders.confirm') }}
        </UButton>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatDate, getStreetAndDistance, formatTimeOnly, timeToRFC3339, formatPrice } from '~/utils/utils'
import type { Order, OrderStatus, OrderType } from '~/types'
import gql from 'graphql-tag'
import { print } from 'graphql'

const { t } = useI18n()
const ordersStore = useOrdersStore()

// Tab state
const selectedTab = ref(0)

const tabItems = computed(() => [
  { label: `${t('orders.all')} (${ordersStore.orders.length})`, value: 0 },
  { label: `${t('orders.pending')} (${ordersStore.orders.filter(o => o.status === 'PENDING').length})`, value: 1 },
  { label: `${t('orders.preparing')} (${ordersStore.orders.filter(o => o.status === 'PREPARING').length})`, value: 2 },
  { label: `${t('orders.ready')} (${ordersStore.orders.filter(o => o.status === 'AWAITING_PICK_UP').length})`, value: 3 },
  { label: `${t('orders.completed')} (${ordersStore.orders.filter(o => ['DELIVERED', 'PICKED_UP'].includes(o.status)).length})`, value: 4 }
])

const filteredOrders = computed(() => {
  const orders = ordersStore.orders
  switch (selectedTab.value) {
    case 1:
      return orders.filter(o => o.status === 'PENDING')
    case 2:
      return orders.filter(o => o.status === 'PREPARING')
    case 3:
      return orders.filter(o => o.status === 'AWAITING_PICK_UP')
    case 4:
      return orders.filter(o => ['DELIVERED', 'PICKED_UP'].includes(o.status))
    default:
      return orders
  }
})

// Order details state
const selectedOrder = ref<Order | null>(null)
const showOrderDetails = ref(false)
const sliderDeltaMinutes = ref<number>(0)
const baseEstimatedTime = ref<Date | null>(null)
const stagedStatus = ref<OrderStatus | undefined>(undefined)
const isUpdatingPayment = ref(false)

// Cancellation dialog state
const showCancelDialog = ref(false)
const cancelDelay = ref(5)
const confirmDisabled = computed(() => cancelDelay.value > 0)
let cancelTimer: number | undefined = undefined

// Define allowed transitions based on current status and delivery option
const getAllowedStatuses = (current: OrderStatus, deliveryOption: OrderType): OrderStatus[] => {
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
  // "CANCELLED" can be chosen from any state except if already cancelled.
  if (current !== 'CANCELLED') {
    allowed.push('CANCELLED')
  }
  return allowed
}

const availableStatuses = computed(() => {
  if (!selectedOrder.value) return []
  return getAllowedStatuses(selectedOrder.value.status, selectedOrder.value.type)
})

// Status icon mapping
const getStatusIcon = (status: OrderStatus): string => {
  const statusIcons: Record<string, string> = {
    PENDING: 'i-lucide-clock',
    CONFIRMED: 'i-lucide-circle-check',
    PREPARING: 'i-lucide-chef-hat',
    AWAITING_PICK_UP: 'i-lucide-hourglass',
    OUT_FOR_DELIVERY: 'i-lucide-bike',
    DELIVERED: 'i-lucide-package-check',
    PICKED_UP: 'i-lucide-circle-check-big',
    FAILED: 'i-lucide-circle-alert',
    CANCELLED: 'i-lucide-circle-x'
  }
  return statusIcons[status] || 'i-lucide-circle-help'
}

// Status color mapping
const getStatusColor = (status: OrderStatus): string => {
  const colors: Record<string, string> = {
    PENDING: 'warning',
    CONFIRMED: 'info',
    PREPARING: 'info',
    AWAITING_PICK_UP: 'warning',
    OUT_FOR_DELIVERY: 'primary',
    DELIVERED: 'success',
    PICKED_UP: 'success',
    FAILED: 'error',
    CANCELLED: 'error'
  }
  return colors[status] || 'neutral'
}

const getPaymentStatusColor = (status: string | undefined) => {
  if (!status) return 'error'
  const colors: Record<string, string> = {
    open: 'warning',
    cancelled: 'neutral',
    pending: 'neutral',
    expired: 'neutral',
    failed: 'error',
    paid: 'success'
  }
  return colors[status.toLowerCase()] || 'neutral'
}

const newEstimatedTime = computed(() => {
  if (!baseEstimatedTime.value || !sliderDeltaMinutes.value) return ''
  const newTime = new Date(baseEstimatedTime.value.getTime() + sliderDeltaMinutes.value * 60000)
  return formatTimeOnly(newTime.toISOString())
})

const canSave = computed(() => {
  return stagedStatus.value || (sliderDeltaMinutes.value ?? 0) > 0
})

// GraphQL Queries and Mutations
const ORDERS_QUERY = gql`
  query {
    orders {
      id
      createdAt
      updatedAt
      status
      type
      isOnlinePayment
      discountAmount
      deliveryFee
      totalPrice
      preferredReadyTime
      estimatedReadyTime
      addressExtra
      orderNote
      orderExtra
      address {
        id
        streetName
        houseNumber
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
          category {
            id
            name
          }
        }
      }
    }
  }
`

const UPDATE_ORDER_MUTATION = gql`
  mutation ($id: ID!, $input: UpdateOrderInput!) {
    updateOrder(id: $id, input: $input) {
      id
      status
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

const { mutate: mutationUpdateOrder } = useGqlMutation<{ updateOrder: Order }>(UPDATE_ORDER_MUTATION)
const { mutate: mutationUpdatePaymentStatus } = useGqlMutation<{ updatePaymentStatus: { id: string, status: string } }>(UPDATE_PAYMENT_STATUS_MUTATION)

const { data: dataOrders, execute: fetchOrders } = await useGqlQuery<{ orders: Order[] }>(
  ORDERS_QUERY,
  {},
  { immediate: true }
)

// Populate the Pinia store with orders fetched from the server
if (dataOrders.value?.orders) {
  ordersStore.setOrders(dataOrders.value?.orders)
}

// Watch for data changes and update store
watch(dataOrders, (newData) => {
  if (newData?.orders) {
    ordersStore.setOrders(newData.orders)
  }
}, { deep: true })

// Component methods
const openOrderDetails = (order: Order) => {
  selectedOrder.value = order
  stagedStatus.value = undefined

  try {
    if (order.estimatedReadyTime) {
      sliderDeltaMinutes.value = 0
      const estimatedDate = new Date(order.estimatedReadyTime)

      if (isNaN(estimatedDate.getTime())) {
        throw new Error('Invalid date format')
      }

      baseEstimatedTime.value = estimatedDate
    } else {
      sliderDeltaMinutes.value = 0
      baseEstimatedTime.value = new Date()
    }
  } catch (e) {
    console.error('Error initializing time:', e)
    baseEstimatedTime.value = new Date()
  }

  showOrderDetails.value = true
}

const handleStatusButton = (newStatus: OrderStatus) => {
  if (stagedStatus.value === newStatus) {
    stagedStatus.value = undefined
  } else {
    stagedStatus.value = newStatus
  }
}

const updateOrder = async (newStatus?: OrderStatus) => {
  if (!selectedOrder.value) return

  if (newStatus === 'CANCELLED') {
    openCancelDialog()
    return
  }

  let status = newStatus
  let estimatedReadyTime: string | undefined

  if (baseEstimatedTime.value && sliderDeltaMinutes.value) {
    const newTime = new Date(baseEstimatedTime.value.getTime() + sliderDeltaMinutes.value * 60000)
    estimatedReadyTime = timeToRFC3339(formatTimeOnly(newTime.toISOString()))
  }

  try {
    const res = await mutationUpdateOrder({
      id: selectedOrder.value.id,
      input: {
        status,
        estimatedReadyTime
      }
    })

    ordersStore.updateOrder(res.updateOrder)
    showOrderDetails.value = false
  } catch (error) {
    console.error('Update failed:', error)
  }
}

const formatOrderSummary = (order: Order) => {
  return order.type === 'DELIVERY' ? t('orders.delivery') : t('orders.pickup')
}

const printReceipt = () => {
  if (!selectedOrder.value) return

  const encodedOrder: string = JSON.stringify(selectedOrder.value)
  if (typeof window !== 'undefined' && 'PrintHandler' in window) {
    (window as any).PrintHandler.print(encodedOrder)
  } else {
    console.error('🖨️ PrintHandler not available')
  }
}

const notificationSound = () => {
  if (typeof window !== 'undefined' && 'SoundHandler' in window) {
    (window as any).SoundHandler.playNotificationSound()
  } else {
    console.error('SoundHandler not available')
  }
}

// Cancellation confirmation dialog
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
  await updateOrder('CANCELLED')
  showCancelDialog.value = false
}

const cancelCancellation = () => {
  showCancelDialog.value = false
  if (cancelTimer) {
    clearInterval(cancelTimer)
    cancelTimer = undefined
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

    // Update the local order with new payment status
    if (selectedOrder.value.payment) {
      selectedOrder.value.payment.status = res.updatePaymentStatus.status
    }

    // Update the order in the store
    ordersStore.updateOrder({
      id: selectedOrder.value.id,
      payment: {
        ...selectedOrder.value.payment,
        status: res.updatePaymentStatus.status
      }
    })
  } catch (error) {
    console.error('Failed to update payment status:', error)
  } finally {
    isUpdatingPayment.value = false
  }
}

onMounted(async () => {
  // Fetch orders on mount to ensure data is loaded on client-side navigation
  await fetchOrders()

  // ORDER UPDATED
  const { data: orderUpdated } = useGqlSubscription<{
    orderUpdated: Partial<Order>
  }>(
    print(gql`
      subscription {
        orderUpdated {
          id
          status
          estimatedReadyTime
          payment {
            status
          }
        }
      }
    `),
    {}
  )

  watch(orderUpdated, (val) => {
    if (val?.orderUpdated) {
      ordersStore.updateOrder(val.orderUpdated)
    }
  })

  // ORDER CREATED
  const { data: orderCreated } = useGqlSubscription<{
    orderCreated: Order
  }>(
    print(gql`
      subscription {
        orderCreated {
          id
          createdAt
          updatedAt
          status
          type
          isOnlinePayment
          discountAmount
          deliveryFee
          totalPrice
          preferredReadyTime
          estimatedReadyTime
          addressExtra
          orderNote
          orderExtra
          address {
            id
            streetName
            houseNumber
            municipalityName
            postcode
            distance
          }
          customer {
            id
            firstName
            lastName
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
              category {
                id
                name
              }
            }
          }
        }
      }
    `),
    {}
  )

  watch(orderCreated, (val) => {
    if (val?.orderCreated) {
      ordersStore.addOrder(val.orderCreated)
      notificationSound()
    }
  })
})
</script>
