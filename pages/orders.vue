<template>
  <div class="p-4 sm:p-6">
    <!-- Page Header -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-highlighted">{{ t('navigation.orders') }}</h1>
      <p class="text-muted">{{ t('orders.subtitle') }}</p>
    </div>

    <!-- ========== MOBILE VIEW: Tab-based (< md) ========== -->
    <div class="md:hidden">
      <!-- Filter Chips (horizontally scrollable) -->
      <div class="flex gap-2 overflow-x-auto pb-3 mb-4 -mx-4 px-4 scrollbar-hide">
        <button
          v-for="chip in mobileChips"
          :key="chip.value"
          class="relative flex items-center gap-1.5 shrink-0 px-3 py-2 rounded-full text-sm font-medium transition-all border"
          :class="selectedTab === chip.value
            ? 'bg-(--ui-primary) text-white border-transparent shadow-sm'
            : 'bg-(--ui-bg-elevated) text-(--ui-text-muted) border-(--ui-border) active:scale-95'
          "
          @click="selectedTab = chip.value"
        >
          <UIcon :name="chip.icon" class="size-4" />
          <span>{{ chip.label }}</span>
          <span
            v-if="chip.count > 0"
            class="ml-0.5 min-w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold px-1"
            :class="selectedTab === chip.value
              ? 'bg-white/25 text-white'
              : 'bg-(--ui-bg-accented) text-(--ui-text)'
            "
          >
            {{ chip.count }}
          </span>
          <!-- Unacknowledged pulse dot -->
          <span
            v-if="chip.value === 0 && ordersStore.unacknowledgedPendingCount > 0"
            class="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-red-500 animate-pulse"
          />
        </button>
      </div>

      <!-- Skeleton Loading -->
      <div v-if="pending" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UCard v-for="i in 4" :key="i">
          <template #header>
            <div class="flex items-center justify-between">
              <div class="space-y-2 flex-1">
                <USkeleton class="h-5 w-32" />
                <USkeleton class="h-3 w-24" />
              </div>
              <USkeleton class="h-6 w-20 rounded-full" />
            </div>
          </template>
          <div class="space-y-3">
            <div class="flex gap-2">
              <USkeleton class="h-5 w-24 rounded-full" />
              <USkeleton class="h-5 w-20 rounded-full" />
            </div>
            <USkeleton class="h-4 w-40" />
            <div class="border-t pt-3 space-y-1">
              <USkeleton class="h-3 w-full" />
              <USkeleton class="h-3 w-3/4" />
            </div>
            <div class="border-t pt-3 flex justify-between">
              <USkeleton class="h-4 w-12" />
              <USkeleton class="h-4 w-16" />
            </div>
          </div>
        </UCard>
      </div>

      <!-- Orders Grid -->
      <div v-else-if="filteredOrders.length" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UCard
          v-for="order in filteredOrders"
          :key="order.id"
          :class="[
            'cursor-pointer hover:shadow-lg transition-shadow',
            order.status === 'PENDING' ? 'border-l-4 border-l-warning bg-warning/5' : ''
          ]"
          @click="openOrderDetails(order)"
        >
          <template #header>
            <div class="flex items-center justify-between">
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-1">
                  <h3 class="text-lg font-bold">{{ order.displayCustomerName }}</h3>
                </div>
                <p class="text-sm text-muted">{{ formatDate(order.createdAt, locale) }}</p>
                <p
                  v-if="isActiveStatus(order.status)"
                  :class="['text-xs font-medium', getTimeSince(order.createdAt).color]"
                >
                  {{ getTimeSince(order.createdAt).text }}
                </p>
              </div>
              <UBadge :color="getStatusColor(order.status)" variant="soft">
                {{ t(`orders.status.${order.status?.toLowerCase()}`) }}
              </UBadge>
            </div>
          </template>

          <div class="space-y-4">
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

            <div>
              <p class="text-sm text-muted flex items-center gap-1">
                <UIcon name="i-lucide-phone" class="size-4" />
                {{ order.customer?.phoneNumber }}
              </p>
              <p v-if="order.type === 'DELIVERY'" class="text-sm text-muted flex items-center gap-1">
                <UIcon name="i-lucide-map-pin" class="size-4" />
                {{ order.displayAddress }}
              </p>
              <p v-else class="text-sm text-muted">{{ t('orders.pickup') }}</p>
            </div>

            <div class="border-t pt-3 space-y-1">
              <p class="text-sm font-medium">{{ t('orders.items') }}:</p>
              <div v-for="(item, idx) in order.items" :key="`${item.product.id}-${item.choice?.id ?? idx}`" class="flex justify-between text-sm">
                <span>
                  {{ item.quantity }}x {{ item.product.code || item.product.name }}
                  <span v-if="item.choice" class="text-xs text-muted">({{ item.choice.name }})</span>
                </span>
                <span>{{ formatPrice(item.totalPrice) }}</span>
              </div>
            </div>

            <div class="border-t pt-3 flex justify-between font-bold">
              <span>Total</span>
              <span>{{ formatPrice(order.totalPrice) }}</span>
            </div>

            <div v-if="order.estimatedReadyTime" class="text-sm flex items-center gap-1 text-muted">
              <UIcon name="i-lucide-clock" class="size-4" />
              {{ t('orders.estimatedTime') }}: {{ formatTimeOnly(order.estimatedReadyTime, locale) }}
            </div>
          </div>
        </UCard>
      </div>

      <!-- Empty State -->
      <UCard v-else class="text-center py-12">
        <UIcon name="i-lucide-package-x" class="size-16 mx-auto mb-4 text-muted" />
        <p class="text-lg text-muted">{{ t('orders.noOrders') }}</p>
      </UCard>
    </div>

    <!-- ========== TABLET+ VIEW: Kanban board (md:) ========== -->
    <div class="hidden md:block">
      <!-- Skeleton Loading -->
      <div v-if="pending" class="flex gap-5 overflow-x-auto pb-4">
        <div v-for="i in 4" :key="i" class="kanban-column flex-shrink-0 w-80 lg:w-96">
          <div class="kanban-column-header">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                <USkeleton class="size-8 rounded-lg" />
                <div class="space-y-1">
                  <USkeleton class="h-4 w-24" />
                  <USkeleton class="h-3 w-16" />
                </div>
              </div>
              <USkeleton class="h-6 w-8 rounded-full" />
            </div>
          </div>
          <div class="kanban-column-body space-y-3">
            <UCard v-for="j in 2" :key="j">
              <div class="space-y-2">
                <div class="flex items-start justify-between">
                  <div class="space-y-1">
                    <USkeleton class="h-4 w-28" />
                    <USkeleton class="h-3 w-20" />
                  </div>
                  <USkeleton class="h-5 w-14 rounded-full" />
                </div>
                <USkeleton class="h-5 w-20 rounded-full" />
                <div class="flex justify-between pt-2 border-t border-default">
                  <USkeleton class="h-3 w-16" />
                  <USkeleton class="h-4 w-14" />
                </div>
              </div>
            </UCard>
          </div>
        </div>
      </div>

      <!-- Kanban Board -->
      <div v-else class="flex gap-5 overflow-x-auto pb-4 min-h-[calc(100vh-200px)]">
        <div
          v-for="column in kanbanColumns"
          :key="column.key"
          class="kanban-column flex-shrink-0 w-80 lg:w-96 flex flex-col transition-all duration-200"
          :class="[
            column.accentClass,
            dragOverColumnKey === column.key ? 'kanban-drop-target' : '',
            draggedOrder && column.statuses.includes(draggedOrder.status) ? 'kanban-drag-source' : ''
          ]"
          @dragover="(e: DragEvent) => onColumnDragOver(e, column)"
          @dragleave="onColumnDragLeave"
          @drop="(e: DragEvent) => onColumnDrop(e, column)"
        >
          <!-- Column Header -->
          <div class="kanban-column-header">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                <div
                  class="size-8 rounded-lg flex items-center justify-center"
                  :class="column.iconBgClass"
                >
                  <UIcon :name="column.icon" class="size-4.5" />
                </div>
                <div>
                  <h3 class="font-semibold text-sm text-highlighted leading-tight">
                    {{ column.label }}
                  </h3>
                  <p class="text-xs text-muted">
                    {{ column.orders.length }} {{ t('orders.items') }}
                  </p>
                </div>
              </div>
              <UBadge
                :color="column.badgeColor"
                variant="soft"
                size="md"
                class="tabular-nums font-bold"
              >
                {{ column.orders.length }}
              </UBadge>
            </div>
          </div>

          <!-- Column Body -->
          <div class="kanban-column-body flex-1 overflow-y-auto space-y-3">
            <UCard
              v-for="order in column.orders"
              :key="order.id"
              :draggable="column.dropStatus !== null ? 'true' : 'false'"
              class="cursor-pointer hover:shadow-md hover:border-(--ui-border-accented) transition-all"
              :class="draggedOrder?.id === order.id ? 'opacity-40 scale-95' : ''"
              @dragstart="(e: DragEvent) => onDragStart(e, order)"
              @dragend="onDragEnd"
              @click="openOrderDetails(order)"
            >
              <div class="space-y-2.5">
                <div class="flex items-start justify-between">
                  <div>
                    <p class="font-bold text-sm text-highlighted">{{ order.displayCustomerName }}</p>
                    <p class="text-xs text-muted mt-0.5">{{ formatDate(order.createdAt, locale) }}</p>
                    <p
                      v-if="isActiveStatus(order.status)"
                      :class="['text-xs font-semibold mt-0.5', getTimeSince(order.createdAt).color]"
                    >
                      {{ getTimeSince(order.createdAt).text }}
                    </p>
                  </div>
                  <div class="flex flex-col items-end gap-1">
                    <UBadge v-if="column.statuses.length > 1" :color="getStatusColor(order.status)" variant="soft" size="xs">
                      {{ t(`orders.status.${order.status.toLowerCase()}`) }}
                    </UBadge>
                    <UBadge :color="getPaymentStatusColor(order.payment?.status)" variant="soft" size="xs">
                      {{ t(`orders.payment.status.${order.payment?.status ? order.payment.status.toLowerCase() : 'notPaid'}`) }}
                    </UBadge>
                  </div>
                </div>

                <div class="flex items-center gap-2">
                  <UBadge color="neutral" variant="subtle" size="xs">
                    <UIcon
                      :name="order.isOnlinePayment ? 'i-lucide-credit-card' : 'i-lucide-banknote'"
                      class="mr-1"
                    />
                    {{ order.isOnlinePayment ? t('orders.paymentMethod.online') : t('orders.paymentMethod.cash') }}
                  </UBadge>
                  <UBadge color="neutral" variant="subtle" size="xs">
                    <UIcon
                      :name="order.type === 'DELIVERY' ? 'i-lucide-bike' : 'i-lucide-shopping-bag'"
                      class="mr-1"
                    />
                    {{ t(`orders.deliveryOption.${order.type?.toLowerCase()}`) }}
                  </UBadge>
                </div>

                <div class="flex justify-between items-center pt-2 border-t border-default">
                  <span class="text-xs text-muted">{{ order.items.length }} {{ t('orders.items') }}</span>
                  <span class="font-bold text-sm text-highlighted">{{ formatPrice(order.totalPrice) }}</span>
                </div>

                <div v-if="order.estimatedReadyTime" class="text-xs flex items-center gap-1 text-muted">
                  <UIcon name="i-lucide-clock" class="size-3" />
                  {{ formatTimeOnly(order.estimatedReadyTime, locale) }}
                </div>
              </div>
            </UCard>

            <!-- Empty column -->
            <div v-if="column.orders.length === 0" class="text-center py-12 text-muted text-sm">
              <UIcon :name="column.icon" class="size-10 mx-auto mb-2 opacity-30" />
              <p>{{ t('orders.noOrders') }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Order Details Slideover -->
    <USlideover
      v-model:open="showOrderDetails"
      :title="t('orders.orderDetails')"
      :description="t('orders.orderDetailsDescription')"
      :ui="{ content: 'min-h-full' }"
    >
      <template v-if="selectedOrder" #body>
        <div class="space-y-6">
          <!-- Order Header -->
          <div class="pb-4 border-b border-default">
            <div class="flex items-start justify-between mb-3">
              <div class="flex-1">
                <h2 class="text-xl font-bold text-highlighted">
                  {{ selectedOrder.displayCustomerName }}
                </h2>
                <p class="text-sm text-muted">{{ formatDate(selectedOrder.createdAt, locale) }}</p>
              </div>
              <div class="flex">
                <UButton
                  icon="i-lucide-printer"
                  :label="t('orders.print.label')"
                  color="primary"
                  class="rounded-r-none"
                  @click="printBoth"
                />
                <UDropdownMenu :items="printMenuItems">
                  <UButton
                    icon="i-lucide-chevron-down"
                    color="primary"
                    class="rounded-l-none border-l border-primary-400/30"
                    square
                  />
                </UDropdownMenu>
              </div>
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
                {{ selectedOrder.displayAddress }}
              </p>
            </div>
          </div>

          <!-- Time Management Section -->
          <div>
            <h3 class="text-sm font-medium mb-2">{{ t('orders.timeManagement') }}</h3>
            <p class="text-sm text-muted mb-4">
              {{ t('orders.preferredTime') }}:
              {{ selectedOrder.preferredReadyTime ? formatTimeOnly(selectedOrder.preferredReadyTime, locale) : t('orders.asap') }}
            </p>

            <div v-if="selectedOrder.estimatedReadyTime" class="mb-4">
              <p class="text-sm text-muted">
                {{ t('orders.currentEstimate') }}:
                <span class="font-bold">{{ formatTimeOnly(selectedOrder.estimatedReadyTime, locale) }}</span>
              </p>
            </div>

            <!-- Quick Time Buttons -->
            <div class="grid grid-cols-4 gap-2 mb-4">
              <UButton
                v-for="minutes in [15, 30, 45, 60]"
                :key="minutes"
                size="lg"
                :variant="sliderDeltaMinutes === minutes ? 'solid' : 'outline'"
                :color="sliderDeltaMinutes === minutes ? 'primary' : 'neutral'"
                @click="sliderDeltaMinutes = minutes"
              >
                +{{ minutes }}min
              </UButton>
            </div>

            <!-- Time Display -->
            <div class="mb-2 flex items-center justify-between">
              <span class="text-sm text-muted">+{{ sliderDeltaMinutes }}{{ t('orders.minutes') }}</span>
              <span class="text-lg font-bold text-primary">{{ newEstimatedTime || formatTimeOnly(selectedOrder.estimatedReadyTime, locale.value) }}</span>
            </div>

            <!-- Time Slider -->
            <USlider
              v-model="sliderDeltaMinutes"
              :min="0"
              :max="90"
              :step="5"
            />
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
              size="lg"
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
                size="lg"
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
            size="lg"
            @click="showOrderDetails = false"
          >
            {{ t('common.cancel') }}
          </UButton>
          <UButton
            :disabled="!canSave"
            block
            size="lg"
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
      :title="t('orders.confirmCancelTitle')"
      :description="t('orders.confirmCancelMessage')"
      :ui="{ footer: 'flex justify-end gap-2' }"
    >
      <template #body>
        <div class="space-y-3">
          <p v-if="selectedOrder" class="text-sm text-muted">
            {{ formatDate(selectedOrder.createdAt, locale) }} - {{ formatOrderSummary(selectedOrder) }}
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
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatDate, formatTimeOnly, timeToRFC3339, formatPrice } from '~/utils/utils'
import type { Order, OrderStatus, OrderType } from '~/types'
import gql from 'graphql-tag'
import { print } from 'graphql'

const { t, locale } = useI18n()
const toast = useToast()
const ordersStore = useOrdersStore()

// Tab state - start as null for SSR, set on client
const selectedTab = ref<number | null>(null)

// Kanban column definitions
interface KanbanColumnDef {
  key: string
  statuses: OrderStatus[]
  dropStatus: OrderStatus | null
  icon: string
  iconBgClass: string
  accentClass: string
  badgeColor: string
}

const kanbanColumnDefs: KanbanColumnDef[] = [
  { key: 'PENDING', statuses: ['PENDING'], dropStatus: 'PENDING', icon: 'i-lucide-clock', iconBgClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-400', accentClass: 'kanban-accent-warning', badgeColor: 'warning' },
  { key: 'CONFIRMED', statuses: ['CONFIRMED'], dropStatus: 'CONFIRMED', icon: 'i-lucide-circle-check', iconBgClass: 'bg-sky-500/15 text-sky-700 dark:text-sky-400', accentClass: 'kanban-accent-info', badgeColor: 'info' },
  { key: 'PREPARING', statuses: ['PREPARING'], dropStatus: 'PREPARING', icon: 'i-lucide-chef-hat', iconBgClass: 'bg-sky-500/15 text-sky-700 dark:text-sky-400', accentClass: 'kanban-accent-info', badgeColor: 'info' },
  { key: 'AWAITING_PICK_UP', statuses: ['AWAITING_PICK_UP'], dropStatus: 'AWAITING_PICK_UP', icon: 'i-lucide-hourglass', iconBgClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-400', accentClass: 'kanban-accent-warning', badgeColor: 'warning' },
  { key: 'OUT_FOR_DELIVERY', statuses: ['OUT_FOR_DELIVERY'], dropStatus: 'OUT_FOR_DELIVERY', icon: 'i-lucide-bike', iconBgClass: 'bg-violet-500/15 text-violet-700 dark:text-violet-400', accentClass: 'kanban-accent-primary', badgeColor: 'primary' },
  { key: 'COMPLETED', statuses: ['DELIVERED', 'PICKED_UP', 'CANCELLED'], dropStatus: null, icon: 'i-lucide-circle-check-big', iconBgClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400', accentClass: 'kanban-accent-success', badgeColor: 'success' }
]

// Drag state (kanban)
const draggedOrder = ref<Order | null>(null)
const dragOverColumnKey = ref<string | null>(null)

const onDragStart = (e: DragEvent, order: Order) => {
  draggedOrder.value = order
  e.dataTransfer?.setData('text/plain', order.id)
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}

const onDragEnd = () => {
  draggedOrder.value = null
  dragOverColumnKey.value = null
}

const onColumnDragOver = (e: DragEvent, column: KanbanColumnDef) => {
  if (!draggedOrder.value || !column.dropStatus || column.statuses.includes(draggedOrder.value.status)) return
  e.preventDefault()
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
  dragOverColumnKey.value = column.key
}

const onColumnDragLeave = () => {
  dragOverColumnKey.value = null
}

const onColumnDrop = async (e: DragEvent, column: KanbanColumnDef) => {
  e.preventDefault()
  dragOverColumnKey.value = null
  if (!draggedOrder.value || !column.dropStatus || column.statuses.includes(draggedOrder.value.status)) return

  const order = draggedOrder.value
  const previousStatus = order.status
  const targetStatus = column.dropStatus
  draggedOrder.value = null

  // Optimistic update
  ordersStore.updateOrder({ id: order.id, status: targetStatus })

  try {
    await mutationUpdateOrder({
      id: order.id,
      input: { status: targetStatus }
    })
  } catch {
    // Revert on failure
    ordersStore.updateOrder({ id: order.id, status: previousStatus })
    toast.add({ title: t('orders.errors.updateFailed'), color: 'error' })
  }
}

// Order details state
const selectedOrder = ref<Order | null>(null)
const showOrderDetails = ref(false)
const sliderDeltaMinutes = ref<number>(0)
const initialSliderValue = ref<number>(0)
const baseEstimatedTime = ref<Date | null>(null)
const stagedStatus = ref<OrderStatus | undefined>(undefined)
const isUpdatingPayment = ref(false)

// Time-since tracking (updates every 30s)
const now = ref(new Date())
let nowInterval: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  selectedTab.value = 0
  nowInterval = setInterval(() => {
    now.value = new Date()
  }, 30000)
})

onUnmounted(() => {
  if (nowInterval) clearInterval(nowInterval)
})

const isActiveStatus = (status: OrderStatus): boolean => {
  return ['PENDING', 'CONFIRMED', 'PREPARING'].includes(status)
}

const getTimeSince = (createdAt: string): { text: string; color: string } => {
  const created = new Date(createdAt)
  const diffMs = now.value.getTime() - created.getTime()
  const diffMin = Math.max(0, Math.floor(diffMs / 60000))

  let text: string
  if (diffMin < 60) {
    text = t('orders.timeSince.minutes', { count: diffMin })
  } else {
    const hours = Math.floor(diffMin / 60)
    text = t('orders.timeSince.hours', { count: hours })
  }

  let color: string
  if (diffMin < 5) {
    color = 'text-success'
  } else if (diffMin < 15) {
    color = 'text-warning'
  } else {
    color = 'text-error'
  }

  return { text, color }
}

// Cancellation dialog state
const showCancelDialog = ref(false)
const cancelDelay = ref(5)
const confirmDisabled = computed(() => cancelDelay.value > 0)
let cancelTimer: number | undefined = undefined

// Print menu items
const printMenuItems = computed(() => [[
  {
    label: t('orders.print.both'),
    icon: 'i-lucide-printer',
    click: () => printBoth()
  },
  {
    label: t('orders.print.client'),
    icon: 'i-lucide-receipt',
    click: () => printReceipt()
  },
  {
    label: t('orders.print.kitchen'),
    icon: 'i-lucide-chef-hat',
    click: () => printKitchen()
  }
]])

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
  if (!baseEstimatedTime.value) return ''
  const adjustment = sliderDeltaMinutes.value - initialSliderValue.value
  const newTime = new Date(baseEstimatedTime.value.getTime() + adjustment * 60000)
  return formatTimeOnly(newTime.toISOString(), locale.value)
})

const canSave = computed(() => {
  return stagedStatus.value || sliderDeltaMinutes.value !== initialSliderValue.value
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
      displayCustomerName
      displayAddress
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
        choice {
          id
          name
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

const { data: dataOrders, pending } = await useGqlQuery<{ orders: Order[] }>(
  ORDERS_QUERY,
  {},
  { immediate: true, cache: true }
)

// Populate the Pinia store with orders fetched from the server
if (dataOrders.value?.orders) {
  ordersStore.setOrders(dataOrders.value?.orders)
}

// Use store data for reactive updates and SSR support
const orders = computed(() => ordersStore.orders)

// Kanban columns (tablet+ view)
const kanbanColumns = computed(() =>
  kanbanColumnDefs.map(def => ({
    ...def,
    label: def.key === 'COMPLETED'
      ? t('orders.statusShort.completed')
      : t(`orders.status.${def.key.toLowerCase()}`),
    orders: orders.value.filter(o => def.statuses.includes(o.status))
  }))
)

// Mobile filter chips
const mobileChips = computed(() => [
  {
    label: t('orders.statusShort.pending'),
    icon: 'i-lucide-clock',
    value: 0,
    count: orders.value.filter(o => o.status === 'PENDING').length
  },
  {
    label: t('orders.statusShort.confirmed'),
    icon: 'i-lucide-circle-check',
    value: 1,
    count: orders.value.filter(o => o.status === 'CONFIRMED').length
  },
  {
    label: t('orders.statusShort.preparing'),
    icon: 'i-lucide-chef-hat',
    value: 2,
    count: orders.value.filter(o => o.status === 'PREPARING').length
  },
  {
    label: t('orders.statusShort.awaiting_pick_up'),
    icon: 'i-lucide-hourglass',
    value: 3,
    count: orders.value.filter(o => o.status === 'AWAITING_PICK_UP').length
  },
  {
    label: t('orders.statusShort.out_for_delivery'),
    icon: 'i-lucide-bike',
    value: 4,
    count: orders.value.filter(o => o.status === 'OUT_FOR_DELIVERY').length
  },
  {
    label: t('orders.statusShort.completed'),
    icon: 'i-lucide-circle-check-big',
    value: 5,
    count: orders.value.filter(o => ['DELIVERED', 'PICKED_UP', 'CANCELLED', 'FAILED'].includes(o.status)).length
  }
])

const filteredOrders = computed(() => {
  const ordersList = orders.value
  if (selectedTab.value === null) {
    return ordersList.filter(o => o.status === 'PENDING')
  }
  switch (selectedTab.value) {
    case 0:
      return ordersList.filter(o => o.status === 'PENDING')
    case 1:
      return ordersList.filter(o => o.status === 'CONFIRMED')
    case 2:
      return ordersList.filter(o => o.status === 'PREPARING')
    case 3:
      return ordersList.filter(o => o.status === 'AWAITING_PICK_UP')
    case 4:
      return ordersList.filter(o => o.status === 'OUT_FOR_DELIVERY')
    case 5:
      return ordersList.filter(o => ['DELIVERED', 'PICKED_UP', 'CANCELLED', 'FAILED'].includes(o.status))
    default:
      return ordersList.filter(o => o.status === 'PENDING')
  }
})

// Watch for data changes and update store
watch(dataOrders, (newData) => {
  if (newData?.orders) {
    ordersStore.setOrders(newData.orders)
  }
}, { deep: true })

// ORDER UPDATED SUBSCRIPTION
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

// ORDER CREATED SUBSCRIPTION
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
        source
        isOnlinePayment
        discountAmount
        deliveryFee
        totalPrice
        preferredReadyTime
        estimatedReadyTime
        addressExtra
        orderNote
        orderExtra
        displayCustomerName
        displayAddress
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
          choice {
            id
            name
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

// Component methods
const openOrderDetails = (order: Order) => {
  ordersStore.acknowledgeOrder(order.id)
  selectedOrder.value = order
  stagedStatus.value = undefined

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
    console.error('Error initializing time:', e)
    baseEstimatedTime.value = new Date()
    sliderDeltaMinutes.value = 0
    initialSliderValue.value = 0
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

  if (baseEstimatedTime.value && sliderDeltaMinutes.value !== initialSliderValue.value) {
    const adjustment = sliderDeltaMinutes.value - initialSliderValue.value
    const newTime = new Date(baseEstimatedTime.value.getTime() + adjustment * 60000)
    estimatedReadyTime = timeToRFC3339(formatTimeOnly(newTime.toISOString(), locale.value))
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
    toast.add({ title: t('orders.errors.updateFailed'), color: 'error' })
  }
}

const formatOrderSummary = (order: Order) => {
  return order.type === 'DELIVERY' ? t('orders.delivery') : t('orders.pickup')
}

const printReceipt = async () => {
  if (!selectedOrder.value) return

  const { $printer } = useNuxtApp()
  const encodedOrder: string = JSON.stringify(selectedOrder.value)

  try {
    await $printer.print(encodedOrder)
  } catch (error) {
    console.error('Print failed:', error)
    toast.add({ title: t('orders.errors.printFailed'), color: 'error' })
  }
}

const printKitchen = async () => {
  if (!selectedOrder.value) return

  const { $printer } = useNuxtApp()
  const encodedOrder: string = JSON.stringify(selectedOrder.value)

  try {
    await $printer.printKitchen(encodedOrder)
  } catch (error) {
    console.error('Kitchen print failed:', error)
    toast.add({ title: t('orders.errors.printFailed'), color: 'error' })
  }
}

const printBoth = async () => {
  if (!selectedOrder.value) return

  const { $printer } = useNuxtApp()
  const encodedOrder: string = JSON.stringify(selectedOrder.value)

  try {
    await $printer.printBoth(encodedOrder)
  } catch (error) {
    console.error('Print both failed:', error)
    toast.add({ title: t('orders.errors.printFailed'), color: 'error' })
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

    if (selectedOrder.value.payment) {
      selectedOrder.value.payment.status = res.updatePaymentStatus.status
    }

    ordersStore.updateOrder({
      id: selectedOrder.value.id,
      payment: {
        ...selectedOrder.value.payment,
        status: res.updatePaymentStatus.status
      }
    })
  } catch (error) {
    console.error('Failed to update payment status:', error)
    toast.add({ title: t('orders.errors.paymentUpdateFailed'), color: 'error' })
  } finally {
    isUpdatingPayment.value = false
  }
}
</script>
