<template>
  <div class="p-4 sm:p-6">
    <!-- Page Header -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-highlighted">{{ t('orderHistory.title') }}</h1>
      <p class="text-sm text-muted mt-0.5">{{ t('orderHistory.subtitle') }}</p>
    </div>

    <!-- Summary Cards -->
    <div class="grid grid-cols-3 gap-4 mb-6">
      <div
        v-for="card in summaryCards"
        :key="card.label"
        class="rounded-xl border border-(--ui-border) bg-(--ui-bg) p-4"
      >
        <div class="flex items-center gap-3">
          <div class="flex items-center justify-center size-10 rounded-lg bg-(--ui-bg-accented)">
            <UIcon :name="card.icon" class="size-5 text-muted" />
          </div>
          <div>
            <p class="text-xs text-muted">{{ card.label }}</p>
            <p class="text-lg font-bold text-highlighted tabular-nums">
              <template v-if="loading">
                <USkeleton class="h-5 w-16 mt-1" />
              </template>
              <template v-else>{{ card.value }}</template>
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters Bar -->
    <div class="flex flex-wrap items-center gap-3 mb-4">
      <!-- Date Range -->
      <UInput
        v-model="startDate"
        type="date"
        size="sm"
        class="w-40"
      />
      <span class="text-muted text-sm">-</span>
      <UInput
        v-model="endDate"
        type="date"
        size="sm"
        class="w-40"
      />

      <!-- Status Filter -->
      <USelectMenu
        v-model="selectedStatus"
        :items="statusOptions"
        size="sm"
        class="w-44"
      />

      <!-- Type Filter -->
      <div class="flex items-center gap-1 rounded-lg bg-(--ui-bg-accented) p-1">
        <button
          v-for="opt in typeOptions"
          :key="opt.value"
          class="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer"
          :class="selectedType === opt.value
            ? 'bg-(--ui-bg) text-highlighted shadow-sm'
            : 'text-muted hover:text-highlighted'
          "
          @click="selectedType = opt.value"
        >
          <UIcon v-if="opt.icon" :name="opt.icon" class="size-3.5" />
          {{ opt.label }}
        </button>
      </div>

      <!-- Search -->
      <UInput
        v-model="searchQuery"
        icon="i-lucide-search"
        :placeholder="t('orderHistory.search')"
        size="sm"
        class="w-48"
      />
    </div>

    <!-- Data Table -->
    <div class="rounded-xl border border-(--ui-border) overflow-hidden bg-(--ui-bg)">
      <UTable
        v-if="!loading && historyOrders.length > 0"
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
            {{ row.original.status }}
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

      <!-- Skeleton Loading -->
      <div v-if="loading" class="divide-y divide-(--ui-border)">
        <div v-for="i in 10" :key="i" class="flex items-center gap-4 px-4 py-3">
          <div class="flex-1 space-y-1.5">
            <USkeleton class="h-3.5 w-32" />
            <USkeleton class="h-3 w-24" />
          </div>
          <USkeleton class="h-3.5 w-20" />
          <USkeleton class="h-5 w-16 rounded-full" />
          <USkeleton class="h-3.5 w-16" />
          <USkeleton class="h-3.5 w-14" />
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="!loading && historyOrders.length === 0" class="flex flex-col items-center justify-center py-16">
        <UIcon name="i-lucide-package-x" class="size-12 mb-3 text-muted" />
        <p class="text-muted text-sm">{{ t('orderHistory.noResults') }}</p>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="!loading && summary && summary.totalOrders > pageSize" class="flex justify-center mt-6">
      <UPagination
        v-model:page="currentPage"
        :total="summary.totalOrders"
        :items-per-page="pageSize"
        show-edges
      />
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
const loading = ref(true)

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

const fetchOrders = async () => {
  loading.value = true
  const input: Record<string, unknown> = {
    first: pageSize,
    page: currentPage.value
  }

  if (startDate.value) {
    input.startDate = new Date(`${startDate.value}T00:00:00`).toISOString()
  }
  if (endDate.value) {
    input.endDate = new Date(`${endDate.value}T23:59:59`).toISOString()
  }
  if (selectedStatus.value) input.status = selectedStatus.value
  if (selectedType.value) input.orderType = selectedType.value
  if (searchQuery.value) input.search = searchQuery.value

  try {
    const res = await $gqlFetch<{ orderHistory: { orders: HistoryOrder[]; summary: HistorySummary } }>(
      ORDER_HISTORY_QUERY,
      { variables: { input } }
    )
    historyOrders.value = res.orderHistory.orders
    summary.value = res.orderHistory.summary
  } catch {
    historyOrders.value = []
    summary.value = null
  } finally {
    loading.value = false
  }
}

// Initial fetch
await fetchOrders()

// Refetch on filter/page changes
let debounceTimer: ReturnType<typeof setTimeout> | undefined
watch([currentPage, selectedStatus, selectedType, startDate, endDate], () => {
  fetchOrders()
})
watch(searchQuery, () => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    currentPage.value = 1
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

// --- Table ---
const columns = computed(() => [
  { accessorKey: 'customer', header: t('orderHistory.customer') },
  { accessorKey: 'date', header: t('orderHistory.date') },
  { accessorKey: 'status', header: t('orderHistory.status') },
  { accessorKey: 'type', header: t('orderHistory.type'), meta: { class: { td: 'hidden sm:table-cell', th: 'hidden sm:table-cell' } } },
  { accessorKey: 'total', header: t('orderHistory.total') },
  { accessorKey: 'items', header: t('orderHistory.items'), meta: { class: { td: 'hidden md:table-cell', th: 'hidden md:table-cell' } } }
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
