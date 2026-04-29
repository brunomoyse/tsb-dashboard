<template>
  <div class="p-3 sm:p-4 md:p-6">
    <!-- Page Header -->
    <div class="mb-3 sm:mb-6">
      <h1 class="text-lg sm:text-2xl font-bold text-highlighted">{{ t('navigation.orders') }}</h1>
      <p class="hidden sm:block text-muted">{{ t('orders.subtitle') }}</p>
    </div>

    <!-- Stale order alert banner (Phase 8) -->
    <div
      v-if="staleOrderCount > 0"
      class="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-3 mb-3 sm:mb-6 rounded-lg bg-[#D08A2E]/10 border border-[#D08A2E]/25 text-sm sm:text-base text-[#D08A2E]"
    >
      <UIcon name="i-lucide-alert-triangle" class="size-4 sm:size-5 shrink-0" />
      <span class="flex-1">{{ t('orders.staleAlert', { count: staleOrderCount }) }}</span>
      <UButton
        v-if="firstStaleOrder"
        size="xs"
        variant="soft"
        color="warning"
        :label="t('orders.orderDetails')"
        @click="openOrderDetails(firstStaleOrder)"
      />
    </div>

    <!-- ========== MOBILE VIEW: Tab-based (< md) ========== -->
    <div class="md:hidden">
      <!-- Filter Icons (fixed row, no scrolling) -->
      <div class="flex gap-2 mb-3">
        <button
          v-for="chip in mobileChips"
          :key="chip.value"
          class="relative flex-1 flex flex-col items-center gap-1.5 py-3 sm:py-4 rounded-xl transition-all"
          :class="selectedTab === chip.value
            ? 'bg-(--ui-primary) text-white shadow-sm'
            : 'bg-(--ui-bg-elevated) text-(--ui-text-muted) border border-(--ui-border) active:scale-95'
          "
          @click="selectedTab = chip.value"
        >
          <UIcon :name="chip.icon" class="size-6 sm:size-7" />
          <span
            class="text-sm sm:text-base font-bold tabular-nums"
            :class="selectedTab === chip.value ? 'text-white/80' : ''"
          >
            {{ chip.count }}
          </span>
          <span class="text-xs leading-none" :class="selectedTab === chip.value ? 'text-white/70' : 'text-muted'">
            {{ chip.label }}
          </span>
          <!-- Unacknowledged pulse dot -->
          <span
            v-if="chip.value === 0 && ordersStore.unacknowledgedPendingCount > 0"
            class="absolute -top-0.5 -right-0.5 size-3 rounded-full bg-red-500 animate-pulse"
          />
        </button>
      </div>

      <!-- Skeleton Loading -->
      <div v-if="pending" class="space-y-2">
        <div v-for="i in 6" :key="i" class="flex items-center gap-3 p-3 rounded-xl bg-(--ui-bg) border border-(--ui-border)">
          <USkeleton class="size-5 rounded shrink-0" />
          <div class="flex-1 space-y-1.5">
            <div class="flex justify-between">
              <USkeleton class="h-4 w-28" />
              <USkeleton class="h-4 w-14" />
            </div>
            <div class="flex justify-between">
              <USkeleton class="h-3 w-20" />
              <USkeleton class="h-5 w-16 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      <!-- Orders List -->
      <div v-else-if="filteredOrders.length" class="space-y-2">
        <div
          v-for="order in filteredOrders"
          :key="order.id"
          class="flex items-center gap-3 p-3 sm:p-4 rounded-xl bg-(--ui-bg) border border-(--ui-border) cursor-pointer active:scale-[0.98] transition-all"
          :class="isActiveStatus(order.status) ? getTimeSince(order.createdAt).cardClass : ''"
          @click="openOrderDetails(order)"
        >
          <!-- Type icon -->
          <UIcon
            :name="order.type === 'DELIVERY' ? 'i-lucide-bike' : 'i-lucide-shopping-bag'"
            class="size-5 sm:size-6 shrink-0 text-muted"
          />

          <!-- Content -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-2">
              <span class="font-bold text-sm sm:text-base text-highlighted truncate">{{ order.displayCustomerName }}</span>
              <span class="font-bold text-sm sm:text-base text-highlighted shrink-0">{{ formatPrice(order.totalPrice) }}</span>
            </div>
            <div class="flex items-center justify-between gap-2 mt-0.5 sm:mt-1">
              <div class="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted">
                <span>{{ order.items.length }} {{ t('orders.items') }}</span>
                <UIcon
                  :name="order.isOnlinePayment ? 'i-lucide-credit-card' : 'i-lucide-banknote'"
                  :class="['size-3.5 sm:size-4', getPaymentIconClass(order)]"
                />
                <span
                  v-if="isActiveStatus(order.status)"
                  :class="['font-bold', getTimeSince(order.createdAt).color]"
                >
                  {{ getTimeSince(order.createdAt).text }}
                </span>
                <UBadge v-if="isActiveStatus(order.status) && getTimeSince(order.createdAt).isStale" color="error" variant="soft" size="xs">!</UBadge>
              </div>
              <UBadge :color="getStatusColor(order.status)" variant="soft" size="xs">
                {{ t(`orders.status.${order.status?.toLowerCase()}`) }}
              </UBadge>
            </div>
            <p v-if="order.type === 'DELIVERY' && order.address" class="text-xs sm:text-sm text-muted truncate mt-0.5">
              <UIcon name="i-lucide-map-pin" class="size-3 sm:size-3.5 inline-block align-text-bottom" />
              {{ order.address.streetName }} {{ order.address.houseNumber }}
            </p>
          </div>

          <!-- Quick action button (Phase 7) -->
          <UButton
            v-if="hasNextStatus(order)"
            icon="i-lucide-arrow-right-circle"
            size="md"
            variant="ghost"
            color="primary"
            square
            class="shrink-0"
            :aria-label="t('orders.advanceStatus')"
            @click.stop="quickAdvanceStatus(order)"
          />
        </div>
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
      <div v-if="pending" class="flex gap-3 pb-4">
        <div v-for="i in 5" :key="i" class="kanban-column flex-1 min-w-0">
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
      <div v-else class="flex gap-3 pb-4 min-h-[calc(100vh-200px)]">
        <div
          v-for="column in kanbanColumns"
          :key="column.key"
          :data-column-key="column.key"
          class="kanban-column flex-1 min-w-0 flex flex-col transition-all duration-200"
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

            <!-- Date filter for completed column -->
            <div v-if="column.key === 'COMPLETED'" class="flex items-center justify-between mt-2 pt-2 border-t border-default">
              <UButton
                icon="i-lucide-chevron-left"
                size="xs"
                variant="ghost"
                color="neutral"
                square
                @click="shiftCompletedDate(-1)"
              />
              <button
                class="text-xs font-medium text-muted hover:text-highlighted transition-colors"
                :class="isCompletedFilterToday ? '' : 'underline'"
                @click="completedFilterDate = new Date().toISOString().slice(0, 10)"
              >
                {{ completedFilterLabel }}
              </button>
              <UButton
                icon="i-lucide-chevron-right"
                size="xs"
                variant="ghost"
                color="neutral"
                square
                :disabled="isCompletedFilterToday"
                @click="shiftCompletedDate(1)"
              />
            </div>
          </div>

          <!-- Column Body -->
          <div class="kanban-column-body flex-1 overflow-y-auto space-y-3">
            <UCard
              v-for="order in column.orders"
              :key="order.id"
              :draggable="column.key !== 'COMPLETED' ? 'true' : 'false'"
              :class="[
                'cursor-pointer hover:shadow-md hover:border-(--ui-border-accented) transition-all',
                column.key !== 'COMPLETED' ? 'kanban-touch-draggable' : '',
                draggedOrder?.id === order.id ? 'opacity-40 scale-95' : '',
                isActiveStatus(order.status) ? getTimeSince(order.createdAt).cardClass : ''
              ]"
              @dragstart="(e: DragEvent) => onDragStart(e, order)"
              @dragend="onDragEnd"
              @touchstart="(e: TouchEvent) => onCardTouchStart(e, order, column)"
              @click="openOrderDetails(order)"
            >
              <div class="space-y-2">
                <!-- Row 1: Type icon + name + total -->
                <div class="flex items-center gap-2">
                  <UIcon
                    :name="order.type === 'DELIVERY' ? 'i-lucide-bike' : 'i-lucide-shopping-bag'"
                    class="size-4 shrink-0 text-muted"
                  />
                  <span class="font-bold text-sm text-highlighted truncate flex-1">{{ order.displayCustomerName }}</span>
                  <span class="font-bold text-sm text-highlighted shrink-0">{{ formatPrice(order.totalPrice) }}</span>
                </div>

                <!-- Address (delivery only) -->
                <p v-if="order.type === 'DELIVERY' && order.displayAddress" class="text-xs text-muted truncate">
                  {{ order.displayAddress }}
                </p>

                <!-- Row 2: Items + payment icon + time-since -->
                <div class="flex items-center justify-between text-xs">
                  <div class="flex items-center gap-2 text-muted">
                    <span>{{ order.items.length }} {{ t('orders.items') }}</span>
                    <UIcon
                      :name="order.isOnlinePayment ? 'i-lucide-credit-card' : 'i-lucide-banknote'"
                      :class="['size-3.5', getPaymentIconClass(order)]"
                    />
                  </div>
                  <div v-if="isActiveStatus(order.status)" class="flex items-center gap-1">
                    <UBadge v-if="getTimeSince(order.createdAt).isStale" color="error" variant="soft" size="xs">!</UBadge>
                    <span :class="['font-bold', getTimeSince(order.createdAt).color]">
                      {{ getTimeSince(order.createdAt).text }}
                    </span>
                  </div>
                  <UBadge v-else-if="column.statuses.length > 1" :color="getStatusColor(order.status)" variant="soft" size="xs">
                    {{ t(`orders.status.${order.status.toLowerCase()}`) }}
                  </UBadge>
                </div>

                <!-- Row 3: Estimated time + payment status (only when noteworthy) -->
                <div
                  v-if="order.estimatedReadyTime || order.payment?.status?.toLowerCase() !== 'paid'"
                  class="flex items-center justify-between pt-1.5 border-t border-default"
                >
                  <span v-if="order.estimatedReadyTime" class="text-xs text-muted flex items-center gap-1">
                    <UIcon name="i-lucide-clock" class="size-3" />
                    {{ formatTimeOnly(order.estimatedReadyTime, locale) }}
                  </span>
                  <span v-else />
                  <UBadge
                    v-if="order.payment?.status?.toLowerCase() !== 'paid'"
                    :color="getPaymentStatusColor(order.payment?.status)"
                    variant="soft"
                    size="xs"
                  >
                    {{ t(`orders.payment.status.${order.payment?.status ? order.payment.status.toLowerCase() : 'notPaid'}`) }}
                  </UBadge>
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
      :side="slideoverSide"
      :ui="slideoverUi"
    >
      <template v-if="selectedOrder" #body>
        <div class="space-y-5">
          <!-- 1. Header: identity + status + print -->
          <div class="flex items-start justify-between">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <UIcon
                  :name="selectedOrder.type === 'DELIVERY' ? 'i-lucide-bike' : 'i-lucide-shopping-bag'"
                  class="size-5 shrink-0 text-muted"
                />
                <h2 class="text-lg font-bold text-highlighted truncate">
                  {{ selectedOrder.displayCustomerName }}
                </h2>
              </div>
              <div class="flex items-center gap-2 text-sm text-muted">
                <span>{{ formatDate(selectedOrder.createdAt, locale) }}</span>
                <UBadge :color="getStatusColor(selectedOrder.status)" variant="soft" size="xs">
                  {{ t(`orders.status.${selectedOrder.status?.toLowerCase()}`) }}
                </UBadge>
              </div>
            </div>
            <div class="flex shrink-0">
              <UButton
                icon="i-lucide-printer"
                :label="t('orders.print.label')"
                color="primary"
                size="lg"
                class="rounded-r-none"
                @click="printBoth"
              />
              <UDropdownMenu :items="printMenuItems">
                <UButton
                  icon="i-lucide-chevron-down"
                  color="primary"
                  size="lg"
                  class="rounded-l-none border-l border-primary-400/30"
                  square
                />
              </UDropdownMenu>
            </div>
          </div>

          <!-- 2. Stale order alert (Phase 8) -->
          <div
            v-if="isActiveStatus(selectedOrder.status) && getTimeSince(selectedOrder.createdAt).isStale"
            class="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-error"
          >
            <UIcon name="i-lucide-alert-triangle" class="size-4 shrink-0" />
            <span>{{ t('orders.staleDetailAlert', { hours: Math.floor((now.getTime() - new Date(selectedOrder.createdAt).getTime()) / 3600000) }) }}</span>
          </div>

          <!-- 3. Primary Quick Actions -->
          <div v-if="primaryStatuses.length" class="grid gap-2" :class="primaryStatuses.length > 1 ? 'grid-cols-2' : ''">
            <UButton
              v-for="status in primaryStatuses"
              :key="status"
              size="xl"
              block
              :color="getStatusColor(status)"
              :loading="quickActionLoading"
              @click="quickStatusAdvance(status)"
            >
              <UIcon :name="getStatusIcon(status)" class="mr-2" />
              {{ t(`orders.status.${status.toLowerCase()}`) }}
            </UButton>
          </div>

          <!-- 4. Order Items with discount breakdown -->
          <div class="border border-default rounded-lg overflow-hidden">
            <div class="divide-y divide-default">
              <div
                v-for="(item, idx) in selectedOrder.items"
                :key="`${item.product.id}-${item.choice?.id ?? idx}`"
                class="flex items-center justify-between px-3 py-2"
              >
                <div class="flex items-center gap-2 min-w-0 flex-1">
                  <span class="text-sm font-bold text-highlighted shrink-0">{{ item.quantity }}x</span>
                  <span class="text-sm truncate">
                    {{ item.product.code ? `${item.product.code} -` : '' }} {{ item.product.name }}
                    <span v-if="item.choice" class="text-muted">({{ item.choice.name }})</span>
                  </span>
                </div>
                <span class="text-sm font-medium text-highlighted shrink-0 ml-2">{{ formatPrice(item.totalPrice) }}</span>
              </div>
            </div>
            <!-- Subtotal / Discount / Delivery fee breakdown -->
            <template v-if="hasBreakdown">
              <div class="flex items-center justify-between px-3 py-1.5 border-t border-default text-sm text-muted">
                <span>{{ t('orders.subtotal') }}</span>
                <span>{{ formatPrice(itemsSubtotal) }}</span>
              </div>
              <div v-if="parseFloat(selectedOrder.discountAmount) > 0" class="flex items-center justify-between px-3 py-1.5 text-sm text-success">
                <span>{{ t('orders.discount') }}{{ selectedOrder.couponCode ? ` (${selectedOrder.couponCode})` : '' }}</span>
                <span>-{{ formatPrice(selectedOrder.discountAmount) }}</span>
              </div>
              <div v-if="selectedOrder.deliveryFee && parseFloat(selectedOrder.deliveryFee) > 0" class="flex items-center justify-between px-3 py-1.5 text-sm text-muted">
                <span>{{ t('orders.deliveryFeeLabel') }}</span>
                <span>{{ formatPrice(selectedOrder.deliveryFee) }}</span>
              </div>
            </template>
            <div class="flex items-center justify-between px-3 py-2.5 bg-(--ui-bg-accented) border-t border-default">
              <span class="text-sm font-bold text-highlighted">{{ t('orders.total') }}</span>
              <span class="text-base font-bold text-highlighted">{{ formatPrice(selectedOrder.totalPrice) }}</span>
            </div>
          </div>

          <!-- 5. Customer & Delivery Info + Payment -->
          <div class="space-y-1.5 text-sm">
            <a
              v-if="selectedOrder.customer?.phoneNumber"
              :href="`tel:${selectedOrder.customer.phoneNumber}`"
              class="flex items-center gap-2 text-muted hover:text-highlighted transition-colors"
            >
              <UIcon name="i-lucide-phone" class="size-4 shrink-0" />
              <span class="underline underline-offset-2">{{ selectedOrder.customer.phoneNumber }}</span>
            </a>
            <div v-if="selectedOrder.type === 'DELIVERY' && selectedOrder.displayAddress" class="flex items-center gap-2">
              <a
                :href="`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedOrder.displayAddress)}`"
                target="_blank"
                class="flex items-center gap-2 text-muted hover:text-highlighted transition-colors"
              >
                <UIcon name="i-lucide-map-pin" class="size-4 shrink-0" />
                <span class="underline underline-offset-2">{{ selectedOrder.displayAddress }}</span>
              </a>
              <UBadge
                v-if="selectedOrder.isManualAddress && selectedOrder.status === 'PENDING'"
                color="warning"
                variant="soft"
                size="xs"
              >
                {{ t('orders.manualAddress') }}
              </UBadge>
            </div>
            <div class="flex items-center gap-2 text-muted">
              <UIcon
                :name="selectedOrder.isOnlinePayment ? 'i-lucide-credit-card' : 'i-lucide-banknote'"
                class="size-4 shrink-0"
              />
              <span>{{ selectedOrder.isOnlinePayment ? t('orders.paymentMethod.online') : t('orders.paymentMethod.cash') }}</span>
              <UBadge
                :color="getPaymentStatusColor(selectedOrder.payment?.status)"
                variant="soft"
                size="xs"
              >
                {{ t(`orders.payment.status.${selectedOrder.payment?.status ? selectedOrder.payment.status.toLowerCase() : 'notPaid'}`) }}
              </UBadge>
            </div>
            <div v-if="selectedOrder.orderNote" class="flex items-start gap-2 text-muted">
              <UIcon name="i-lucide-message-square" class="size-4 shrink-0 mt-0.5" />
              <span class="italic">{{ selectedOrder.orderNote }}</span>
            </div>
            <!-- Inline payment action -->
            <UButton
              v-if="selectedOrder.payment?.status?.toLowerCase() !== 'paid'"
              color="success"
              size="sm"
              :loading="isUpdatingPayment"
              class="mt-1"
              @click="markAsPaid"
            >
              <UIcon name="i-lucide-check-circle" class="mr-1" />
              {{ t('orders.payment.markAsPaid') }}
            </UButton>
          </div>

          <!-- 6. Time Management (simplified: buttons only, no slider) -->
          <div class="border border-default rounded-lg p-3 space-y-3">
            <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <span class="text-sm text-muted">
                {{ t('orders.preferredTime') }}:
                <span class="font-medium text-highlighted">
                  {{ selectedOrder.preferredReadyTime ? formatTimeOnly(selectedOrder.preferredReadyTime, locale) : t('orders.asap') }}
                </span>
              </span>
              <span v-if="selectedOrder.estimatedReadyTime" class="text-sm text-muted">
                {{ t('orders.currentEstimate') }}:
                <span class="font-bold text-primary">{{ formatTimeOnly(selectedOrder.estimatedReadyTime, locale) }}</span>
              </span>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <UButton
                v-for="minutes in [15, 30, 45, 60]"
                :key="minutes"
                size="sm"
                :variant="sliderDeltaMinutes === minutes ? 'solid' : 'outline'"
                :color="sliderDeltaMinutes === minutes ? 'primary' : 'neutral'"
                @click="sliderDeltaMinutes = sliderDeltaMinutes === minutes ? 0 : minutes"
              >
                +{{ minutes }}m
              </UButton>
            </div>

            <div v-if="newEstimatedTime" class="text-sm text-center">
              <span class="text-muted">{{ t('orders.newEstimatedTime') }}: </span>
              <span class="font-bold text-primary text-base">{{ newEstimatedTime }}</span>
            </div>
          </div>

          <!-- 7. Other Actions (collapsible) -->
          <details v-if="secondaryStatuses.length" class="group">
            <summary class="text-sm font-medium text-muted cursor-pointer select-none flex items-center gap-1 hover:text-highlighted transition-colors">
              <UIcon name="i-lucide-chevron-right" class="size-4 transition-transform group-open:rotate-90" />
              {{ t('orders.otherActions') }}
            </summary>
            <div class="grid grid-cols-2 gap-2 mt-2">
              <UButton
                v-for="status in secondaryStatuses"
                :key="status"
                size="md"
                :variant="stagedStatus === status ? 'solid' : 'outline'"
                :color="stagedStatus === status ? getStatusColor(status) : 'neutral'"
                :class="status === 'CANCELLED' ? 'col-span-2' : ''"
                @click="handleStatusButton(status)"
              >
                <UIcon :name="getStatusIcon(status)" class="mr-1" />
                {{ t(`orders.status.${status.toLowerCase()}`) }}
              </UButton>
            </div>
          </details>
        </div>
      </template>

      <template #footer>
        <div class="flex flex-col sm:flex-row gap-2 pb-[env(safe-area-inset-bottom)]">
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
            v-if="canSave"
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

    <!-- Two-step print: tear kitchen ticket, then continue to client ticket -->
    <UModal
      v-model:open="showPrintContinueDialog"
      :title="t('orders.printContinueTitle')"
      :description="t('orders.printContinueMessage')"
      :dismissible="false"
      :ui="{ footer: 'flex justify-end gap-2' }"
    >
      <template #footer>
        <UButton
          color="neutral"
          variant="outline"
          @click="cancelContinueClientPrint"
        >
          {{ t('orders.back') }}
        </UButton>
        <UButton
          color="primary"
          icon="i-lucide-printer"
          @click="continueToClientPrint"
        >
          {{ t('orders.printContinueCta') }}
        </UButton>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { Order, OrderStatus, OrderType } from '~/types'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { formatDate, formatPrice, formatTimeOnly, timeToRFC3339 } from '~/utils/utils'
import gql from 'graphql-tag'
import { print } from 'graphql'
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()
const toast = useToast()
const ordersStore = useOrdersStore()
// Tab state - start as null for SSR, set on client
const selectedTab = ref<number | null>(null)

// Mobile detection for slideover direction (bottom sheet on phones)
const isMobile = ref(false)
const slideoverSide = computed<'right' | 'bottom'>(() => isMobile.value ? 'bottom' : 'right')
const slideoverUi = computed(() =>
  isMobile.value
    ? { content: 'max-h-[92dvh] rounded-t-2xl' }
    : { content: 'min-h-full' }
)

// Kanban column definitions
interface KanbanColumnDef {
  key: string
  statuses: OrderStatus[]
  dropStatus: OrderStatus | null
  icon: string
  iconBgClass: string
  accentClass: string
  badgeColor: UiColor
}

const kanbanColumnDefs: KanbanColumnDef[] = [
  { key: 'NEW', statuses: ['PENDING', 'CONFIRMED'], dropStatus: null, icon: 'i-lucide-inbox', iconBgClass: 'bg-(--ui-bg-accented) text-(--ui-text)', accentClass: 'kanban-accent-warning', badgeColor: 'warning' },
  { key: 'PREPARING', statuses: ['PREPARING'], dropStatus: 'PREPARING', icon: 'i-lucide-chef-hat', iconBgClass: 'bg-(--ui-bg-accented) text-(--ui-text)', accentClass: 'kanban-accent-primary', badgeColor: 'primary' },
  { key: 'AWAITING_PICK_UP', statuses: ['AWAITING_PICK_UP'], dropStatus: 'AWAITING_PICK_UP', icon: 'i-lucide-hourglass', iconBgClass: 'bg-(--ui-bg-accented) text-(--ui-text)', accentClass: 'kanban-accent-success', badgeColor: 'success' },
  { key: 'OUT_FOR_DELIVERY', statuses: ['OUT_FOR_DELIVERY'], dropStatus: 'OUT_FOR_DELIVERY', icon: 'i-lucide-bike', iconBgClass: 'bg-(--ui-bg-accented) text-(--ui-text)', accentClass: 'kanban-accent-info', badgeColor: 'info' },
  { key: 'COMPLETED', statuses: ['DELIVERED', 'PICKED_UP', 'CANCELLED'], dropStatus: 'DELIVERED', icon: 'i-lucide-circle-check-big', iconBgClass: 'bg-(--ui-bg-accented) text-(--ui-text)', accentClass: 'kanban-accent-success', badgeColor: 'success' }
]

// Completed column date filter (defaults to today)
const completedFilterDate = ref<string>(new Date().toISOString().slice(0, 10))

const completedFilterLabel = computed(() => {
  const today = new Date().toISOString().slice(0, 10)
  const date = new Date(`${completedFilterDate.value}T12:00:00`)
  if (completedFilterDate.value === today) {
    return new Intl.DateTimeFormat(locale.value, { weekday: 'short' }).format(date)
  }
  return new Intl.DateTimeFormat(locale.value, { day: 'numeric', month: 'short' }).format(date)
})

const isCompletedFilterToday = computed(() => completedFilterDate.value === new Date().toISOString().slice(0, 10))

const shiftCompletedDate = (days: number) => {
  const d = new Date(`${completedFilterDate.value}T12:00:00`)
  d.setDate(d.getDate() + days)
  completedFilterDate.value = d.toISOString().slice(0, 10)
}

// Drag state (kanban)
const draggedOrder = ref<Order | null>(null)
const dragOverColumnKey = ref<string | null>(null)

const performDrop = async (order: Order, column: KanbanColumnDef) => {
  if (!column.dropStatus || column.statuses.includes(order.status)) return

  // For the COMPLETED column, resolve the correct terminal status based on order type
  let targetStatus = column.dropStatus
  if (column.key === 'COMPLETED') {
    targetStatus = order.type === 'PICKUP' ? 'PICKED_UP' : 'DELIVERED'
  }

  const allowed = getAllowedStatuses(order.status, order.type)
  if (!allowed.includes(targetStatus)) {
    toast.add({ title: t('orders.errors.invalidTransition'), color: 'warning' })
    return
  }

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

// HTML5 Drag & Drop handlers (desktop)
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

const onColumnDrop = (e: DragEvent, column: KanbanColumnDef) => {
  e.preventDefault()
  dragOverColumnKey.value = null
  if (!draggedOrder.value || !column.dropStatus || column.statuses.includes(draggedOrder.value.status)) return

  const order = draggedOrder.value
  draggedOrder.value = null
  performDrop(order, column)
}

// Touch drag handlers (tablet/touch devices)
// Uses a drag handle with touch-action:none so the browser doesn't intercept for scrolling
const touchDragJustEnded = ref(false)

const onDocTouchMove = (e: TouchEvent) => {
  e.preventDefault()
  const [touch] = e.touches
  if (!touch) return

  // Find which column the finger is over
  const el = document.elementFromPoint(touch.clientX, touch.clientY)
  const columnEl = el?.closest('[data-column-key]') as HTMLElement | null
  if (columnEl) {
    const key = columnEl.dataset.columnKey!
    const column = kanbanColumnDefs.find(c => c.key === key)
    if (column && column.dropStatus && draggedOrder.value && !column.statuses.includes(draggedOrder.value.status)) {
      dragOverColumnKey.value = key
    } else {
      dragOverColumnKey.value = null
    }
  } else {
    dragOverColumnKey.value = null
  }
}

const onDocTouchEnd = (e: TouchEvent) => {
  document.removeEventListener('touchmove', onDocTouchMove)
  document.removeEventListener('touchend', onDocTouchEnd)
  document.removeEventListener('touchcancel', onDocTouchEnd)

  if (!draggedOrder.value) return

  // Find drop target
  const [touch] = e.changedTouches
  if (!touch) return
  const el = document.elementFromPoint(touch.clientX, touch.clientY)
  const columnEl = el?.closest('[data-column-key]') as HTMLElement | null

  if (columnEl) {
    const key = columnEl.dataset.columnKey!
    const column = kanbanColumnDefs.find(c => c.key === key)
    if (column && column.dropStatus && !column.statuses.includes(draggedOrder.value.status)) {
      performDrop(draggedOrder.value, column)
    }
  }

  // Clean up
  draggedOrder.value = null
  dragOverColumnKey.value = null

  // Prevent the subsequent click event from opening order details
  touchDragJustEnded.value = true
  setTimeout(() => { touchDragJustEnded.value = false }, 50)
}

const onCardTouchStart = (_e: TouchEvent, order: Order, column: KanbanColumnDef) => {
  if (!column.dropStatus) return
  draggedOrder.value = order
  navigator.vibrate?.(30)

  // Register document-level listeners (non-passive so we can preventDefault)
  document.addEventListener('touchmove', onDocTouchMove, { passive: false })
  document.addEventListener('touchend', onDocTouchEnd)
  document.addEventListener('touchcancel', onDocTouchEnd)
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

  // Detect phone-sized screens for bottom sheet slideover
  const mql = window.matchMedia('(max-width: 767px)')
  isMobile.value = mql.matches
  mql.addEventListener('change', (e) => { isMobile.value = e.matches })

})

onUnmounted(() => {
  if (nowInterval) clearInterval(nowInterval)
  // Clean up any in-progress touch drag listeners
  document.removeEventListener('touchmove', onDocTouchMove)
  document.removeEventListener('touchend', onDocTouchEnd)
  document.removeEventListener('touchcancel', onDocTouchEnd)
})

const isActiveStatus = (status: OrderStatus): boolean =>
  ['PENDING', 'CONFIRMED', 'PREPARING'].includes(status)

// Whether an order has a non-cancel/non-fail next status (for quick-action button)
const hasNextStatus = (order: Order): boolean =>
  getAllowedStatuses(order.status, order.type).some(s => s !== 'CANCELLED' && s !== 'FAILED')

const getTimeSince = (createdAt: string): { text: string; color: string; cardClass: string; isStale: boolean } => {
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
  let cardClass = ''
  const isStale = diffMin >= 1440 // 24h

  if (diffMin < 5) {
    color = 'text-success'
  } else if (diffMin < 15) {
    color = 'text-warning'
    cardClass = 'border-l-3 border-l-[#D08A2E]'
  } else if (diffMin < 60) {
    color = 'text-error'
    cardClass = 'border-l-3 border-l-red-500'
  } else {
    color = 'text-error'
    cardClass = 'border-l-3 border-l-red-500 bg-red-500/5'
  }

  return { text, color, cardClass, isStale }
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

// Quick action loading state
const quickActionLoading = ref(false)

// Quick status advance from slideover primary buttons (immediate save)
const quickStatusAdvance = async (newStatus: OrderStatus) => {
  if (!selectedOrder.value || quickActionLoading.value) return

  if (newStatus === 'CANCELLED') {
    openCancelDialog()
    return
  }

  quickActionLoading.value = true

  // Also send time estimation if changed
  let estimatedReadyTime: string | undefined
  if (baseEstimatedTime.value && sliderDeltaMinutes.value !== initialSliderValue.value) {
    const adjustment = sliderDeltaMinutes.value - initialSliderValue.value
    const newTime = new Date(baseEstimatedTime.value.getTime() + adjustment * 60000)
    estimatedReadyTime = timeToRFC3339(formatTimeOnly(newTime.toISOString(), locale.value))
  }

  try {
    const res = await mutationUpdateOrder({
      id: selectedOrder.value.id,
      input: { status: newStatus, estimatedReadyTime }
    })
    ordersStore.updateOrder(res.updateOrder)
    showOrderDetails.value = false
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

// Payment icon class based on status
const getPaymentIconClass = (order: Order): string => {
  if (order.payment?.status?.toLowerCase() === 'failed') return 'text-red-500'
  if (!order.isOnlinePayment && order.payment?.status?.toLowerCase() !== 'paid') return 'text-[#D08A2E]'
  return ''
}

// Discount breakdown helpers
const itemsSubtotal = computed(() => {
  if (!selectedOrder.value) return '0'
  const sum = selectedOrder.value.items.reduce((acc, item) => acc + parseFloat(item.totalPrice), 0)
  return sum.toFixed(2)
})

const hasBreakdown = computed(() => {
  if (!selectedOrder.value) return false
  return parseFloat(selectedOrder.value.discountAmount) > 0
    || (selectedOrder.value.deliveryFee && parseFloat(selectedOrder.value.deliveryFee) > 0)
})

// Stale orders count (for banner)
const staleOrders = computed(() =>
  orders.value.filter(o =>
    isActiveStatus(o.status)
    && (now.value.getTime() - new Date(o.createdAt).getTime()) > 7200000 // 2h
  )
)
const staleOrderCount = computed(() => staleOrders.value.length)
const firstStaleOrder = computed(() => staleOrders.value[0] ?? null)

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
type UiColor = 'success' | 'error' | 'primary' | 'secondary' | 'info' | 'warning' | 'neutral'

const getStatusColor = (status: OrderStatus): UiColor => {
  const colors: Record<string, UiColor> = {
    PENDING: 'warning',
    CONFIRMED: 'info',
    PREPARING: 'primary',
    AWAITING_PICK_UP: 'success',
    OUT_FOR_DELIVERY: 'info',
    DELIVERED: 'success',
    PICKED_UP: 'success',
    FAILED: 'error',
    CANCELLED: 'error'
  }
  return colors[status] || 'neutral'
}

const getPaymentStatusColor = (status: string | undefined): UiColor => {
  if (!status) return 'error'
  const colors: Record<string, UiColor> = {
    open: 'warning',
    cancelled: 'neutral',
    canceled: 'neutral',
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

const canSave = computed(() =>
  stagedStatus.value || sliderDeltaMinutes.value !== initialSliderValue.value
)

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
`

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
  kanbanColumnDefs.map(def => {
    let filtered = orders.value.filter(o => def.statuses.includes(o.status))
    if (def.key === 'COMPLETED') {
      filtered = filtered.filter(o => o.updatedAt?.slice(0, 10) === completedFilterDate.value)
    }
    return {
      ...def,
      label: def.key === 'COMPLETED'
        ? t('orders.statusShort.completed')
        : def.key === 'NEW'
          ? t('orders.statusShort.new')
          : t(`orders.status.${def.key.toLowerCase()}`),
      orders: filtered
    }
  })
)

// Mobile filter chips
const mobileChips = computed(() => [
  {
    label: t('orders.statusShort.new'),
    icon: 'i-lucide-inbox',
    value: 0,
    count: orders.value.filter(o => ['PENDING', 'CONFIRMED'].includes(o.status)).length
  },
  {
    label: t('orders.statusShort.preparing'),
    icon: 'i-lucide-chef-hat',
    value: 1,
    count: orders.value.filter(o => o.status === 'PREPARING').length
  },
  {
    label: t('orders.statusShort.awaiting_pick_up'),
    icon: 'i-lucide-hourglass',
    value: 2,
    count: orders.value.filter(o => o.status === 'AWAITING_PICK_UP').length
  },
  {
    label: t('orders.statusShort.out_for_delivery'),
    icon: 'i-lucide-bike',
    value: 3,
    count: orders.value.filter(o => o.status === 'OUT_FOR_DELIVERY').length
  },
  {
    label: t('orders.statusShort.completed'),
    icon: 'i-lucide-circle-check-big',
    value: 4,
    count: orders.value.filter(o => ['DELIVERED', 'PICKED_UP', 'CANCELLED', 'FAILED'].includes(o.status)).length
  }
])

const filteredOrders = computed(() => {
  const ordersList = orders.value
  if (selectedTab.value === null) {
    return ordersList.filter(o => ['PENDING', 'CONFIRMED'].includes(o.status))
  }
  switch (selectedTab.value) {
    case 0:
      return ordersList.filter(o => ['PENDING', 'CONFIRMED'].includes(o.status))
    case 1:
      return ordersList.filter(o => o.status === 'PREPARING')
    case 2:
      return ordersList.filter(o => o.status === 'AWAITING_PICK_UP')
    case 3:
      return ordersList.filter(o => o.status === 'OUT_FOR_DELIVERY')
    case 4:
      return ordersList.filter(o => ['DELIVERED', 'PICKED_UP', 'CANCELLED', 'FAILED'].includes(o.status))
    default:
      return ordersList.filter(o => ['PENDING', 'CONFIRMED'].includes(o.status))
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
        updatedAt
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
  // Skip if a touch drag just ended (prevent accidental opening)
  if (touchDragJustEnded.value) return
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
    if (import.meta.dev) console.error('Error initializing time:', e)
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

  const status = newStatus
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
    if (import.meta.dev) console.error('Update failed:', error)
    toast.add({ title: t('orders.errors.updateFailed'), color: 'error' })
  }
}

const formatOrderSummary = (order: Order) =>
  order.type === 'DELIVERY' ? t('orders.delivery') : t('orders.pickup')

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

// Two-step print flow: kitchen → confirm → client. Required on devices
// Without an auto-cutter (Sunmi V3H) so the operator can tear the kitchen
// Ticket before the client ticket prints and the two sheets are not stuck
// Together.
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

// Single AudioContext reused across chimes — creating one per call leaks on
// Android WebView, where Chromium caps the number of live contexts per page.
let sharedAudioCtx: AudioContext | null = null

const getAudioCtx = (): AudioContext | null => {
  if (sharedAudioCtx) return sharedAudioCtx
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    sharedAudioCtx = new Ctx()
    return sharedAudioCtx
  } catch {
    return null
  }
}

const notificationSound = () => {
  const audioCtx = getAudioCtx()
  if (!audioCtx) return
  // WebViews suspend the context until a user gesture — resume each time.
  const play = () => {
    const t0 = audioCtx.currentTime
    const frequencies = [523.25, 659.25]
    for (let i = 0; i < frequencies.length; i++) {
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.type = 'sine'
      osc.frequency.value = frequencies[i]!
      gain.gain.setValueAtTime(0.3, t0 + i * 0.15)
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + i * 0.15 + 0.4)
      osc.connect(gain)
      gain.connect(audioCtx.destination)
      osc.start(t0 + i * 0.15)
      osc.stop(t0 + i * 0.15 + 0.4)
    }
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().then(play).catch(() => { /* Autoplay blocked */ })
  } else {
    play()
  }
}

// Unlock the AudioContext on the first user interaction so later subscription
// Events can play immediately. Android WebView + Chromium autoplay policy
// Requires a gesture before any audio can be generated.
onMounted(() => {
  const unlock = () => {
    const audioCtx = getAudioCtx()
    if (audioCtx?.state === 'suspended') {
      audioCtx.resume().catch(() => { /* Ignore */ })
    }
    window.removeEventListener('pointerdown', unlock)
    window.removeEventListener('keydown', unlock)
  }
  window.addEventListener('pointerdown', unlock, { once: false })
  window.addEventListener('keydown', unlock, { once: false })
})

// Keep chiming every few seconds as long as any pending order is still
// Unacknowledged (user hasn't opened it or changed its status).
const PENDING_CHIME_INTERVAL_MS = 8000
let pendingChimeTimer: ReturnType<typeof setInterval> | null = null

watch(
  () => ordersStore.unacknowledgedPendingCount,
  (count, prev) => {
    if (count > 0 && !pendingChimeTimer) {
      pendingChimeTimer = setInterval(notificationSound, PENDING_CHIME_INTERVAL_MS)
    } else if (count === 0 && pendingChimeTimer) {
      clearInterval(pendingChimeTimer)
      pendingChimeTimer = null
    }
    // First unacknowledged pending arriving while loop was dormant: ensure one
    // Immediate tick (notificationSound is already fired by orderCreated watcher
    // For genuinely new orders; this covers the edge case of a refresh leaving
    // An unacknowledged pending order behind).
    if (prev === 0 && count > 0) {
      notificationSound()
    }
  },
  { immediate: true },
)

onUnmounted(() => {
  if (pendingChimeTimer) {
    clearInterval(pendingChimeTimer)
    pendingChimeTimer = null
  }
})

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
  if (!selectedOrder.value) return
  try {
    const res = await mutationUpdateOrder({
      id: selectedOrder.value.id,
      input: { status: 'CANCELLED' as OrderStatus }
    })
    ordersStore.updateOrder(res.updateOrder)
    showCancelDialog.value = false
    showOrderDetails.value = false
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
</script>
