<template>
  <div class="p-3 sm:p-6">
    <!-- Page Header -->
    <div class="mb-4 sm:mb-6">
      <h1 class="text-lg sm:text-2xl font-bold text-highlighted">{{ t('orderHistory.title') }}</h1>
      <p class="hidden sm:block text-sm text-muted mt-0.5">{{ t('orderHistory.subtitle') }}</p>
    </div>

    <!-- Summary Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
      <div
        v-for="card in summaryCards"
        :key="card.label"
        class="rounded-xl border border-(--ui-border) bg-(--ui-bg) p-3 sm:p-4"
      >
        <div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
          <div class="hidden sm:flex items-center justify-center size-10 rounded-lg bg-(--ui-bg-accented)">
            <UIcon :name="card.icon" class="size-5 text-muted" />
          </div>
          <div>
            <p class="text-xs text-muted">{{ card.label }}</p>
            <p class="text-base sm:text-lg font-bold text-highlighted tabular-nums">
              <USkeleton v-if="initialLoading" class="h-5 w-16 mt-1" />
              <template v-else>{{ card.value }}</template>
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters Bar -->
    <div class="space-y-2 sm:space-y-0 sm:flex sm:flex-wrap sm:items-center sm:gap-3 mb-4">
      <!-- Date Range -->
      <div class="flex items-center gap-2">
        <label for="start-date" class="sr-only">{{ t('orderHistory.startDate') }}</label>
        <UInput
          id="start-date"
          v-model="startDate"
          type="date"
          size="md"
          class="flex-1 sm:w-40 sm:flex-none"
        />
        <span class="text-muted text-sm" aria-hidden="true">-</span>
        <label for="end-date" class="sr-only">{{ t('orderHistory.endDate') }}</label>
        <UInput
          id="end-date"
          v-model="endDate"
          type="date"
          size="md"
          class="flex-1 sm:w-40 sm:flex-none"
        />
      </div>

      <!-- Status + Type + Search row -->
      <div class="flex items-center gap-2">
        <!-- Status Filter -->
        <USelectMenu
          v-model="selectedStatus"
          :items="statusOptions"
          size="md"
          class="flex-1 sm:w-44 sm:flex-none"
        />

        <!-- Type Filter -->
        <div class="flex items-center gap-0.5 rounded-lg bg-(--ui-bg-accented) p-1">
          <button
            v-for="opt in typeOptions"
            :key="opt.value"
            class="flex items-center gap-1 px-2.5 sm:px-3 py-2 rounded-md text-xs font-medium transition-colors cursor-pointer"
            :class="selectedType === opt.value
              ? 'bg-(--ui-bg) text-highlighted shadow-sm'
              : 'text-muted hover:text-highlighted'
            "
            @click="selectedType = opt.value"
          >
            <UIcon v-if="opt.icon" :name="opt.icon" class="size-4" />
            <span>{{ opt.label }}</span>
          </button>
        </div>
      </div>

      <!-- Search -->
      <UInput
        v-model="searchQuery"
        icon="i-lucide-search"
        :placeholder="t('orderHistory.search')"
        size="md"
        class="sm:w-48"
      />
    </div>

    <!-- Desktop: Table view (>= md) -->
    <div class="hidden md:block rounded-xl border border-(--ui-border) overflow-hidden bg-(--ui-bg)">
      <UTable
        v-if="historyOrders.length > 0"
        :columns="columns"
        :data="historyOrders"
        :ui="{
          th: 'text-xs font-semibold uppercase tracking-wider text-(--ui-text-muted) py-3 px-4',
          td: 'py-3 px-4'
        }"
      >
        <template #customer-cell="{ row }">
          <span class="font-medium text-highlighted">{{ row.original.displayCustomerName }}</span>
        </template>

        <template #date-cell="{ row }">
          <span class="text-sm text-muted">{{ formatOrderDate(row.original.createdAt) }}</span>
        </template>

        <template #status-cell="{ row }">
          <UBadge :color="getStatusColor(row.original.status)" variant="soft" size="xs">
            {{ t(`orders.status.${row.original.status.toLowerCase()}`) }}
          </UBadge>
        </template>

        <template #type-cell="{ row }">
          <span class="inline-flex items-center gap-1 text-sm text-muted">
            <UIcon
              :name="row.original.type === 'DELIVERY' ? 'i-lucide-bike' : 'i-lucide-shopping-bag'"
              class="size-3.5"
            />
            {{ row.original.type === 'DELIVERY' ? t('orders.delivery') : t('orders.pickup') }}
          </span>
        </template>

        <template #total-cell="{ row }">
          <span class="text-sm font-semibold tabular-nums">{{ belPriceFormat.format(Number(row.original.totalPrice)) }}</span>
        </template>

        <template #items-cell="{ row }">
          <span class="text-sm text-muted tabular-nums">{{ row.original.items.length }}</span>
        </template>
      </UTable>
    </div>

    <!-- Mobile: Card list (< md) -->
    <div class="md:hidden space-y-2">
      <div
        v-for="order in historyOrders"
        :key="order.id"
        class="flex items-center gap-3 p-3 sm:p-4 rounded-xl bg-(--ui-bg) border border-(--ui-border)"
      >
        <UIcon
          :name="order.type === 'DELIVERY' ? 'i-lucide-bike' : 'i-lucide-shopping-bag'"
          class="size-5 sm:size-6 shrink-0 text-muted"
        />
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-2">
            <span class="font-bold text-sm sm:text-base text-highlighted truncate">{{ order.displayCustomerName }}</span>
            <span class="font-bold text-sm sm:text-base text-highlighted shrink-0 tabular-nums">{{ belPriceFormat.format(Number(order.totalPrice)) }}</span>
          </div>
          <div class="flex items-center justify-between gap-2 mt-0.5 sm:mt-1">
            <span class="text-xs sm:text-sm text-muted">{{ formatOrderDate(order.createdAt) }}</span>
            <UBadge :color="getStatusColor(order.status)" variant="soft" size="xs">
              {{ t(`orders.status.${order.status.toLowerCase()}`) }}
            </UBadge>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading skeleton -->
    <div v-if="initialLoading" class="space-y-2 md:hidden">
      <div v-for="i in 8" :key="i" class="flex items-center gap-3 p-3 rounded-xl bg-(--ui-bg) border border-(--ui-border)">
        <USkeleton class="size-5 rounded shrink-0" />
        <div class="flex-1 space-y-1.5">
          <div class="flex justify-between">
            <USkeleton class="h-4 w-28" />
            <USkeleton class="h-4 w-14" />
          </div>
          <div class="flex justify-between">
            <USkeleton class="h-3 w-24" />
            <USkeleton class="h-5 w-16 rounded-full" />
          </div>
        </div>
      </div>
    </div>
    <div v-if="initialLoading" class="hidden md:block divide-y divide-(--ui-border) rounded-xl border border-(--ui-border) bg-(--ui-bg)">
      <div v-for="i in 10" :key="i" class="flex items-center gap-4 px-4 py-3">
        <USkeleton class="h-3.5 w-32" />
        <USkeleton class="h-3.5 w-20" />
        <USkeleton class="h-5 w-16 rounded-full" />
        <USkeleton class="h-3.5 w-16" />
        <USkeleton class="h-3.5 w-14" />
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="!initialLoading && historyOrders.length === 0" class="flex flex-col items-center justify-center py-16 rounded-xl border border-(--ui-border) bg-(--ui-bg)">
      <UIcon name="i-lucide-package-x" class="size-12 mb-3 text-muted" />
      <p class="text-muted text-sm">{{ t('orderHistory.noResults') }}</p>
    </div>

    <!-- Load more button -->
    <div v-if="hasMore && !initialLoading" class="flex justify-center py-6">
      <UButton
        :loading="loadingMore"
        variant="ghost"
        color="neutral"
        size="lg"
        @click="loadNextPage"
      >
        {{ t('common.loadMore') }}
      </UButton>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import gql from 'graphql-tag'
import { print } from 'graphql'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const { $gqlFetch } = useNuxtApp()

const belPriceFormat = new Intl.NumberFormat('fr-BE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  style: 'currency',
  currency: 'EUR'
})

// --- State ---
const currentPage = ref(1)
const pageSize = 20
const searchQuery = ref('')
const selectedStatus = ref('')
const selectedType = ref('')
const startDate = ref('')
const endDate = ref('')

interface HistoryOrder {
  id: string
  createdAt: string
  status: string
  type: string
  totalPrice: string
  displayCustomerName: string
  items: { quantity: number }[]
}

interface HistorySummary {
  totalOrders: number
  totalRevenue: string
  averageOrder: string
}

const historyOrders = ref<HistoryOrder[]>([])
const summary = ref<HistorySummary | null>(null)
const initialLoading = ref(true)
const loadingMore = ref(false)
const hasMore = ref(true)

// --- Filter options ---
const statusOptions = computed(() => [
  { label: t('orderHistory.allStatuses'), value: '' },
  { label: t('orders.status.pending'), value: 'PENDING' },
  { label: t('orders.status.confirmed'), value: 'CONFIRMED' },
  { label: t('orders.status.preparing'), value: 'PREPARING' },
  { label: t('orders.status.awaiting_pick_up'), value: 'AWAITING_PICK_UP' },
  { label: t('orders.status.out_for_delivery'), value: 'OUT_FOR_DELIVERY' },
  { label: t('orders.status.delivered'), value: 'DELIVERED' },
  { label: t('orders.status.picked_up'), value: 'PICKED_UP' },
  { label: t('orders.status.cancelled'), value: 'CANCELLED' },
  { label: t('orders.status.failed'), value: 'FAILED' }
])

const typeOptions = computed(() => [
  { value: '', label: t('orderHistory.allTypes'), icon: '' },
  { value: 'DELIVERY', label: t('orders.delivery'), icon: 'i-lucide-bike' },
  { value: 'PICKUP', label: t('orders.pickup'), icon: 'i-lucide-shopping-bag' }
])

// --- GraphQL ---
const ORDER_HISTORY_QUERY = print(gql`
  query OrderHistory($input: OrderHistoryInput) {
    orderHistory(input: $input) {
      summary {
        totalOrders
        totalRevenue
        averageOrder
      }
      orders {
        id
        createdAt
        status
        type
        totalPrice
        displayCustomerName
        items {
          quantity
        }
      }
    }
  }
`)

const buildInput = (page: number): Record<string, unknown> => {
  const input: Record<string, unknown> = {
    first: pageSize,
    page
  }
  if (startDate.value) input.startDate = new Date(`${startDate.value}T00:00:00`).toISOString()
  if (endDate.value) input.endDate = new Date(`${endDate.value}T23:59:59`).toISOString()
  if (selectedStatus.value) input.status = selectedStatus.value
  if (selectedType.value) input.orderType = selectedType.value
  if (searchQuery.value) input.search = searchQuery.value
  return input
}

const fetchOrders = async () => {
  initialLoading.value = true
  currentPage.value = 1
  hasMore.value = true

  try {
    const res = await $gqlFetch<{ orderHistory: { orders: HistoryOrder[]; summary: HistorySummary } }>(
      ORDER_HISTORY_QUERY,
      { variables: { input: buildInput(1) } }
    )
    historyOrders.value = res.orderHistory.orders
    summary.value = res.orderHistory.summary
    hasMore.value = res.orderHistory.orders.length >= pageSize
  } catch {
    historyOrders.value = []
    summary.value = null
    hasMore.value = false
  } finally {
    initialLoading.value = false
  }
}

const loadNextPage = async () => {
  if (loadingMore.value || !hasMore.value) return
  loadingMore.value = true
  currentPage.value++

  try {
    const res = await $gqlFetch<{ orderHistory: { orders: HistoryOrder[]; summary: HistorySummary } }>(
      ORDER_HISTORY_QUERY,
      { variables: { input: buildInput(currentPage.value) } }
    )
    historyOrders.value.push(...res.orderHistory.orders)
    hasMore.value = res.orderHistory.orders.length >= pageSize
  } catch {
    hasMore.value = false
  } finally {
    loadingMore.value = false
  }
}

// Initial fetch
await fetchOrders()

// Refetch on filter changes (reset to page 1)
let debounceTimer: ReturnType<typeof setTimeout> | undefined
watch([selectedStatus, selectedType, startDate, endDate], () => {
  fetchOrders()
})
watch(searchQuery, () => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    fetchOrders()
  }, 400)
})

// --- Summary cards ---
const summaryCards = computed(() => [
  {
    label: t('orderHistory.totalOrders'),
    value: summary.value?.totalOrders ?? 0,
    icon: 'i-lucide-shopping-bag'
  },
  {
    label: t('orderHistory.totalRevenue'),
    value: belPriceFormat.format(Number(summary.value?.totalRevenue ?? 0)),
    icon: 'i-lucide-banknote'
  },
  {
    label: t('orderHistory.averageOrder'),
    value: belPriceFormat.format(Number(summary.value?.averageOrder ?? 0)),
    icon: 'i-lucide-calculator'
  }
])

// --- Table (desktop only) ---
const columns = computed(() => [
  { accessorKey: 'customer', header: t('orderHistory.customer') },
  { accessorKey: 'date', header: t('orderHistory.date') },
  { accessorKey: 'status', header: t('orderHistory.status') },
  { accessorKey: 'type', header: t('orderHistory.type') },
  { accessorKey: 'total', header: t('orderHistory.total') },
  { accessorKey: 'items', header: t('orderHistory.items') }
])

type UiColor = 'success' | 'error' | 'primary' | 'secondary' | 'info' | 'warning' | 'neutral'

const getStatusColor = (status: string): UiColor => {
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
  return colors[status] ?? 'neutral'
}

const formatOrderDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
</script>
