<template>
  <div class="p-3 sm:p-4 md:p-6">
    <!-- Page Header -->
    <div class="mb-3 sm:mb-6">
      <h1 class="text-lg sm:text-2xl font-bold text-highlighted">{{ t('customers.title') }}</h1>
      <p class="hidden sm:block text-sm text-muted mt-0.5">{{ t('customers.subtitle') }}</p>
    </div>

    <!-- Summary Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4 mb-3 sm:mb-6">
      <div
        v-for="card in summaryCards"
        :key="card.label"
        class="rounded-xl border border-(--ui-border) bg-(--ui-bg) p-3 sm:p-4"
      >
        <div class="flex items-center gap-3">
          <div class="flex items-center justify-center size-10 rounded-lg bg-(--ui-bg-accented) shrink-0">
            <UIcon :name="card.icon" class="size-5 text-muted" />
          </div>
          <div class="min-w-0">
            <p class="text-xs text-muted leading-tight">{{ card.label }}</p>
            <div class="text-base sm:text-lg font-bold text-highlighted tabular-nums truncate">
              <USkeleton v-if="pending" class="h-5 w-14 mt-1" />
              <template v-else>{{ card.value }}</template>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters Bar (sticky on mobile) -->
    <div class="sticky top-0 z-20 -mx-3 sm:mx-0 px-3 sm:px-0 pb-3 sm:pb-4 pt-1 bg-(--ui-bg-accented) sm:static sm:bg-transparent">
      <!-- Search row (search + min orders) -->
      <div class="flex items-center gap-2">
        <UInput
          v-model="searchQuery"
          icon="i-lucide-search"
          :placeholder="t('customers.search')"
          size="lg"
          class="flex-1"
          :ui="{ base: 'h-12 text-base' }"
        />
        <UInput
          id="min-orders"
          v-model.number="minOrders"
          type="number"
          :placeholder="t('customers.filters.minOrders')"
          :min="1"
          size="lg"
          class="w-24 sm:w-32 shrink-0"
          icon="i-lucide-hash"
          :ui="{ base: 'h-12 text-base' }"
          :aria-label="t('customers.filters.minOrders')"
        />
      </div>

      <!-- Combined chip rail: period + type -->
      <div class="relative mt-2 sm:mt-3 -mx-3 sm:mx-0 px-3 sm:px-0 flex items-center gap-2 overflow-x-auto sm:flex-wrap sm:overflow-visible scrollbar-hide">
        <button
          v-for="preset in periodPresets"
          :key="`p-${preset.key}`"
          type="button"
          class="shrink-0 inline-flex items-center h-10 px-4 rounded-full text-sm font-medium border transition-all active:scale-95"
          :class="selectedPeriod === preset.key
            ? 'bg-(--ui-primary) text-white border-(--ui-primary) shadow-sm'
            : 'bg-(--ui-bg-elevated) text-(--ui-text-muted) border-(--ui-border)'
          "
          @click="selectPeriod(preset.key)"
        >
          {{ preset.label }}
        </button>

        <span class="shrink-0 h-6 w-px bg-(--ui-border)" aria-hidden="true" />

        <button
          v-for="opt in orderTypeOptions"
          :key="`t-${opt.value}`"
          type="button"
          class="shrink-0 inline-flex items-center gap-1.5 h-10 px-4 rounded-full text-sm font-medium border transition-all active:scale-95"
          :class="selectedOrderType === opt.value
            ? 'bg-(--ui-primary) text-white border-(--ui-primary) shadow-sm'
            : 'bg-(--ui-bg-elevated) text-(--ui-text-muted) border-(--ui-border)'
          "
          @click="selectedOrderType = opt.value"
        >
          <UIcon v-if="opt.icon" :name="opt.icon" class="size-4" />
          {{ opt.label }}
        </button>
        <div class="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-(--ui-bg-accented) to-transparent sm:hidden" aria-hidden="true" />
      </div>
    </div>

    <!-- ========== MOBILE VIEW: Cards (< md) ========== -->
    <div class="md:hidden">
      <!-- Skeleton -->
      <div v-if="pending" class="space-y-2">
        <div v-for="i in 6" :key="i" class="flex items-center gap-3 p-3 rounded-xl bg-(--ui-bg) border border-(--ui-border)">
          <USkeleton class="size-10 rounded-full shrink-0" />
          <div class="flex-1 space-y-1.5">
            <div class="flex justify-between">
              <USkeleton class="h-4 w-32" />
              <USkeleton class="h-4 w-16" />
            </div>
            <USkeleton class="h-3 w-40" />
            <USkeleton class="h-3 w-28" />
          </div>
        </div>
      </div>

      <!-- Empty -->
      <div
        v-else-if="filteredCustomers.length === 0"
        class="flex flex-col items-center justify-center py-16 px-6 text-center rounded-xl bg-(--ui-bg) border border-(--ui-border)"
      >
        <UIcon name="i-lucide-users" class="size-14 mb-3 text-muted" />
        <p class="text-muted text-sm">{{ t('customers.noResults') }}</p>
      </div>

      <!-- Cards -->
      <div v-else class="space-y-2">
        <button
          v-for="customer in paginatedCustomers"
          :key="customer.userId"
          type="button"
          class="w-full flex items-start gap-3 p-3 rounded-xl bg-(--ui-bg) border border-(--ui-border) text-left active:bg-(--ui-bg-elevated) transition-colors"
          @click="openCustomerOrders(customer)"
        >
          <div class="size-10 rounded-full bg-(--ui-bg-accented) flex items-center justify-center shrink-0 text-sm font-semibold text-(--ui-text-muted)">
            {{ getInitials(customer.firstName, customer.lastName) }}
          </div>

          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-2">
              <span class="font-semibold text-sm text-highlighted truncate">{{ customer.firstName }} {{ customer.lastName }}</span>
              <span class="font-bold text-sm text-highlighted shrink-0 tabular-nums">{{ belPriceFormat.format(Number(customer.totalAmount)) }}</span>
            </div>
            <p class="text-xs text-muted truncate mt-0.5">{{ customer.email }}</p>
            <div class="flex items-center gap-2 mt-1.5 text-xs">
              <span
                class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-medium"
                :class="customer.preferredOrderType === 'DELIVERY'
                  ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400'
                  : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                "
              >
                <UIcon
                  :name="customer.preferredOrderType === 'DELIVERY' ? 'i-lucide-bike' : 'i-lucide-shopping-bag'"
                  class="size-3"
                />
                {{ customer.preferredOrderType === 'DELIVERY' ? t('customers.delivery') : t('customers.pickup') }}
              </span>
              <span class="text-muted tabular-nums">{{ customer.totalOrders }} {{ t('orders.items') }}</span>
              <span class="text-muted truncate">· {{ formatDate(customer.lastOrderDate) }}</span>
            </div>
          </div>

          <UIcon name="i-lucide-chevron-right" class="size-5 text-muted shrink-0 mt-1" />
        </button>
      </div>
    </div>

    <!-- ========== TABLET+ VIEW: Table (md+) ========== -->
    <div class="hidden md:block rounded-xl border border-(--ui-border) overflow-hidden bg-(--ui-bg)">
      <UTable
        v-if="!pending && filteredCustomers.length > 0"
        :columns="columns"
        :data="paginatedCustomers"
        :ui="{
          th: 'text-xs font-semibold uppercase tracking-wider text-(--ui-text-muted) py-3 px-4',
          td: 'py-3 px-4',
          tr: 'cursor-pointer hover:bg-(--ui-bg-elevated) transition-colors'
        }"
        @select="(_e: Event, row: any) => openCustomerOrders(row.original)"
      >
        <template #name-cell="{ row }">
          <div>
            <span class="font-medium text-highlighted">{{ row.original.firstName }} {{ row.original.lastName }}</span>
            <p class="text-xs text-muted lg:hidden">{{ row.original.email }}</p>
          </div>
        </template>

        <template #email-cell="{ row }">
          <span class="text-sm text-muted">{{ row.original.email }}</span>
        </template>

        <template #totalOrders-cell="{ row }">
          <span class="text-sm font-semibold tabular-nums">{{ row.original.totalOrders }}</span>
        </template>

        <template #totalAmount-cell="{ row }">
          <span class="text-sm font-semibold tabular-nums">{{ belPriceFormat.format(Number(row.original.totalAmount)) }}</span>
        </template>

        <template #averageOrder-cell="{ row }">
          <span class="text-sm tabular-nums text-muted">{{ belPriceFormat.format(Number(row.original.averageOrderAmount)) }}</span>
        </template>

        <template #lastOrder-cell="{ row }">
          <span class="text-sm text-muted">{{ formatDate(row.original.lastOrderDate) }}</span>
        </template>

        <template #preferredType-cell="{ row }">
          <span
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
            :class="row.original.preferredOrderType === 'DELIVERY'
              ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400'
              : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
            "
          >
            <UIcon
              :name="row.original.preferredOrderType === 'DELIVERY' ? 'i-lucide-bike' : 'i-lucide-shopping-bag'"
              class="size-3"
            />
            {{ row.original.preferredOrderType === 'DELIVERY' ? t('customers.delivery') : t('customers.pickup') }}
          </span>
        </template>

        <template #registeredAt-cell="{ row }">
          <span class="text-sm text-muted">{{ formatDate(row.original.registeredAt) }}</span>
        </template>
      </UTable>

      <!-- Skeleton Loading -->
      <div v-if="pending" class="divide-y divide-(--ui-border)">
        <div v-for="i in 10" :key="i" class="flex items-center gap-4 px-4 py-3">
          <div class="flex-1 space-y-1.5">
            <USkeleton class="h-3.5 w-32" />
            <USkeleton class="h-3 w-24" />
          </div>
          <USkeleton class="h-3.5 w-12 hidden sm:block" />
          <USkeleton class="h-3.5 w-16 hidden sm:block" />
          <USkeleton class="h-3.5 w-16 hidden md:block" />
          <USkeleton class="h-3.5 w-20 hidden md:block" />
          <USkeleton class="h-5 w-16 rounded-full hidden xl:block" />
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="!pending && filteredCustomers.length === 0" class="flex flex-col items-center justify-center py-16">
        <UIcon name="i-lucide-users" class="size-12 mb-3 text-muted" />
        <p class="text-muted text-sm">{{ t('customers.noResults') }}</p>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="!pending && filteredCustomers.length > pageSize" class="flex justify-center mt-6">
      <UPagination
        v-model:page="page"
        :total="filteredCustomers.length"
        :items-per-page="pageSize"
        show-edges
      />
    </div>
    <!-- Customer Order History Slideover (bottom sheet on mobile, side panel on desktop) -->
    <USlideover
      v-model:open="showOrderHistory"
      :title="t('customers.orderHistory')"
      :side="sheetSide"
      :ui="sheetUi"
    >
      <template v-if="selectedCustomer" #body>
        <div class="space-y-5">
          <!-- Customer Header -->
          <div>
            <h2 class="text-lg font-bold text-highlighted">
              {{ selectedCustomer.firstName }} {{ selectedCustomer.lastName }}
            </h2>
            <div class="space-y-1 mt-1 text-sm text-muted">
              <p>{{ selectedCustomer.email }}</p>
              <p v-if="selectedCustomer.phoneNumber">{{ selectedCustomer.phoneNumber }}</p>
              <p>{{ t('customers.memberSince') }}: {{ formatDate(selectedCustomer.registeredAt) }}</p>
            </div>
          </div>

          <!-- Stats -->
          <div class="grid grid-cols-3 gap-3">
            <div class="rounded-lg bg-(--ui-bg-accented) p-3 text-center">
              <p class="text-lg font-bold text-highlighted tabular-nums">{{ selectedCustomer.totalOrders }}</p>
              <p class="text-xs text-muted">{{ t('customers.totalOrders') }}</p>
            </div>
            <div class="rounded-lg bg-(--ui-bg-accented) p-3 text-center">
              <p class="text-lg font-bold text-highlighted tabular-nums">{{ belPriceFormat.format(Number(selectedCustomer.totalAmount)) }}</p>
              <p class="text-xs text-muted">{{ t('customers.totalAmount') }}</p>
            </div>
            <div class="rounded-lg bg-(--ui-bg-accented) p-3 text-center">
              <p class="text-lg font-bold text-highlighted tabular-nums">{{ belPriceFormat.format(Number(selectedCustomer.averageOrderAmount)) }}</p>
              <p class="text-xs text-muted">{{ t('customers.averageOrder') }}</p>
            </div>
          </div>

          <!-- Orders List -->
          <div class="space-y-2">
            <h3 class="text-sm font-medium text-muted">{{ t('customers.orderHistory') }}</h3>

            <div v-if="loadingOrders" class="space-y-2">
              <div v-for="i in 5" :key="i" class="flex items-center gap-3 p-3 rounded-lg bg-(--ui-bg) border border-(--ui-border)">
                <USkeleton class="size-5 rounded shrink-0" />
                <div class="flex-1 space-y-1">
                  <USkeleton class="h-3.5 w-24" />
                  <USkeleton class="h-3 w-16" />
                </div>
                <USkeleton class="h-4 w-14" />
              </div>
            </div>

            <template v-else-if="customerOrders.length">
              <div
                v-for="order in customerOrders"
                :key="order.id"
                class="flex items-center gap-3 p-3 rounded-lg bg-(--ui-bg) border border-(--ui-border)"
              >
                <UIcon
                  :name="order.type === 'DELIVERY' ? 'i-lucide-bike' : 'i-lucide-shopping-bag'"
                  class="size-5 shrink-0 text-muted"
                />
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-sm font-medium text-highlighted">{{ formatOrderDate(order.createdAt) }}</span>
                    <span class="text-sm font-bold text-highlighted shrink-0 tabular-nums">{{ belPriceFormat.format(Number(order.totalPrice)) }}</span>
                  </div>
                  <div class="flex items-center gap-2 mt-0.5">
                    <UBadge :color="getOrderStatusColor(order.status)" variant="soft" size="xs">
                      {{ order.status }}
                    </UBadge>
                    <span class="text-xs text-muted">{{ order.items.length }} {{ t('orders.items') }}</span>
                  </div>
                </div>
              </div>

              <!-- Load More -->
              <UButton
                v-if="customerOrders.length >= ordersPageSize"
                variant="ghost"
                color="neutral"
                block
                size="sm"
                :loading="loadingMoreOrders"
                @click="loadMoreOrders"
              >
                {{ t('common.loadMore') }}
              </UButton>
            </template>

            <div v-else class="text-center py-8">
              <UIcon name="i-lucide-package-x" class="size-10 mx-auto mb-2 text-muted" />
              <p class="text-sm text-muted">{{ t('customers.noOrdersFound') }}</p>
            </div>
          </div>
        </div>
      </template>
    </USlideover>
  </div>
</template>

<script lang="ts" setup>
import type { CustomerStats, CustomerStatsResponse } from '~/types'
import { computed, onMounted, ref, watch } from 'vue'
import gql from 'graphql-tag'
import { print } from 'graphql'
import { useGqlQuery } from '#imports'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

// Mobile detection for slideover side (bottom sheet on phone, right panel on desktop)
const isMobile = ref(false)
onMounted(() => {
  const mql = window.matchMedia('(max-width: 767px)')
  isMobile.value = mql.matches
  mql.addEventListener('change', (e) => { isMobile.value = e.matches })
})
const sheetSide = computed<'right' | 'bottom'>(() => isMobile.value ? 'bottom' : 'right')
const sheetUi = computed(() =>
  isMobile.value
    ? { content: 'max-h-[92dvh] rounded-t-2xl' }
    : { content: 'max-w-md' }
)

const belPriceFormat = new Intl.NumberFormat('fr-BE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  style: 'currency',
  currency: 'EUR'
})

const searchQuery = ref('')
const page = ref(1)
const pageSize = ref(20)

// --- Filter state ---
type PeriodKey = 'all' | 'today' | 'week' | 'month' | 'year'
const selectedPeriod = ref<PeriodKey>('all')
const selectedOrderType = ref<string>('')
const minOrders = ref<number | undefined>(undefined)

const periodPresets = computed(() => [
  { key: 'all' as PeriodKey, label: t('customers.filters.allTime') },
  { key: 'today' as PeriodKey, label: t('customers.filters.today') },
  { key: 'week' as PeriodKey, label: t('customers.filters.thisWeek') },
  { key: 'month' as PeriodKey, label: t('customers.filters.thisMonth') },
  { key: 'year' as PeriodKey, label: t('customers.filters.thisYear') }
])

const orderTypeOptions = computed(() => [
  { value: '', label: t('customers.filters.allTypes'), icon: '' },
  { value: 'DELIVERY', label: t('customers.delivery'), icon: 'i-lucide-bike' },
  { value: 'PICKUP', label: t('customers.pickup'), icon: 'i-lucide-shopping-bag' }
])

function getDateRange(period: PeriodKey): { startDate?: string; endDate?: string } {
  if (period === 'all') return {}
  const now = new Date()
  let start: Date
  switch (period) {
    case 'today':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      break
    case 'week': {
      start = new Date(now)
      const day = start.getDay()
      // Monday as start of week
      start.setDate(start.getDate() - ((day + 6) % 7))
      start.setHours(0, 0, 0, 0)
      break
    }
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1)
      break
    case 'year':
      start = new Date(now.getFullYear(), 0, 1)
      break
  }
  return {
    startDate: start.toISOString(),
    endDate: now.toISOString()
  }
}

function selectPeriod(key: PeriodKey) {
  selectedPeriod.value = key
}

const queryVariables = computed(() => {
  const { startDate, endDate } = getDateRange(selectedPeriod.value)
  const input: Record<string, unknown> = {}
  if (startDate) input.startDate = startDate
  if (endDate) input.endDate = endDate
  if (selectedOrderType.value) input.orderType = selectedOrderType.value
  if (minOrders.value && minOrders.value > 1) input.minOrders = minOrders.value
  return Object.keys(input).length > 0 ? { input } : {}
})

const CUSTOMER_STATS_QUERY = gql`
  query CustomerStats($input: CustomerStatsInput) {
    customerStats(input: $input) {
      summary {
        totalCustomers
        totalRevenue
        averageOrderValue
        totalOrders
      }
      customers {
        userId
        firstName
        lastName
        email
        phoneNumber
        registeredAt
        totalOrders
        totalAmount
        averageOrderAmount
        firstOrderDate
        lastOrderDate
        preferredOrderType
        deliveryCount
        pickupCount
      }
    }
  }
`

const { data, pending, refetch } = await useGqlQuery<{ customerStats: CustomerStatsResponse }>(
  print(CUSTOMER_STATS_QUERY),
  () => queryVariables.value,
  { immediate: true, cache: false, server: false }
)

// Refetch when filters change
watch([selectedPeriod, selectedOrderType, minOrders], () => {
  page.value = 1
  refetch()
})

const stats = computed(() => data.value?.customerStats)
const customers = computed(() => stats.value?.customers ?? [])
const summary = computed(() => stats.value?.summary)

const filteredCustomers = computed(() => {
  if (!searchQuery.value) return customers.value
  const q = searchQuery.value.toLowerCase()
  return customers.value.filter(c =>
    `${c.firstName} ${c.lastName}`.toLowerCase().includes(q)
    || c.email.toLowerCase().includes(q)
    || (c.phoneNumber && c.phoneNumber.includes(q))
  )
})

const paginatedCustomers = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredCustomers.value.slice(start, start + pageSize.value)
})

watch(searchQuery, () => { page.value = 1 })

const summaryCards = computed(() => [
  {
    label: t('customers.summary.totalCustomers'),
    value: summary.value?.totalCustomers ?? 0,
    icon: 'i-lucide-users'
  },
  {
    label: t('customers.summary.totalRevenue'),
    value: belPriceFormat.format(Number(summary.value?.totalRevenue ?? 0)),
    icon: 'i-lucide-banknote'
  },
  {
    label: t('customers.summary.averageOrder'),
    value: belPriceFormat.format(Number(summary.value?.averageOrderValue ?? 0)),
    icon: 'i-lucide-calculator'
  },
  {
    label: t('customers.summary.totalOrders'),
    value: summary.value?.totalOrders ?? 0,
    icon: 'i-lucide-shopping-bag'
  },
  {
    label: t('customers.summary.avgOrdersPerCustomer'),
    value: summary.value?.totalCustomers
      ? (summary.value.totalOrders / summary.value.totalCustomers).toFixed(1)
      : '0',
    icon: 'i-lucide-repeat'
  }
])

const columns = computed(() => [
  { accessorKey: 'name', header: t('customers.name') },
  { accessorKey: 'email', header: t('customers.email'), meta: { class: { td: 'hidden lg:table-cell', th: 'hidden lg:table-cell' } } },
  { accessorKey: 'totalOrders', header: t('customers.totalOrders') },
  { accessorKey: 'totalAmount', header: t('customers.totalAmount') },
  { accessorKey: 'averageOrder', header: t('customers.averageOrder'), meta: { class: { td: 'hidden md:table-cell', th: 'hidden md:table-cell' } } },
  { accessorKey: 'lastOrder', header: t('customers.lastOrder'), meta: { class: { td: 'hidden md:table-cell', th: 'hidden md:table-cell' } } },
  { accessorKey: 'preferredType', header: t('customers.preferredType'), meta: { class: { td: 'hidden xl:table-cell', th: 'hidden xl:table-cell' } } },
  { accessorKey: 'registeredAt', header: t('customers.registeredAt'), meta: { class: { td: 'hidden xl:table-cell', th: 'hidden xl:table-cell' } } }
])

const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString()

const getInitials = (firstName: string, lastName: string) =>
  `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() || '?'

// --- Customer Order History ---

interface CustomerOrder {
  id: string
  createdAt: string
  status: string
  type: string
  totalPrice: string
  items: { quantity: number; product: { name: string } }[]
}

const selectedCustomer = ref<CustomerStats | null>(null)
const showOrderHistory = ref(false)
const customerOrders = ref<CustomerOrder[]>([])
const loadingOrders = ref(false)
const loadingMoreOrders = ref(false)
const ordersPage = ref(1)
const ordersPageSize = 20

const CUSTOMER_ORDERS_QUERY = print(gql`
  query CustomerOrders($userId: ID!, $first: Int, $page: Int) {
    customerOrders(userId: $userId, first: $first, page: $page) {
      id
      createdAt
      status
      type
      totalPrice
      items {
        quantity
        product {
          name
        }
      }
    }
  }
`)

const { $gqlFetch } = useNuxtApp()

const fetchCustomerOrders = (userId: string, pageNum: number) =>
  $gqlFetch<{ customerOrders: CustomerOrder[] }>(CUSTOMER_ORDERS_QUERY, {
    variables: { userId, first: ordersPageSize, page: pageNum }
  })

const openCustomerOrders = async (customer: CustomerStats) => {
  selectedCustomer.value = customer
  showOrderHistory.value = true
  customerOrders.value = []
  ordersPage.value = 1
  loadingOrders.value = true

  try {
    const res = await fetchCustomerOrders(customer.userId, 1)
    customerOrders.value = res.customerOrders
  } catch {
    customerOrders.value = []
  } finally {
    loadingOrders.value = false
  }
}

const loadMoreOrders = async () => {
  if (!selectedCustomer.value) return
  loadingMoreOrders.value = true
  ordersPage.value++

  try {
    const res = await fetchCustomerOrders(selectedCustomer.value.userId, ordersPage.value)
    customerOrders.value.push(...res.customerOrders)
  } catch {
    // Keep existing orders on failure
  } finally {
    loadingMoreOrders.value = false
  }
}

type UiColor = 'success' | 'error' | 'primary' | 'secondary' | 'info' | 'warning' | 'neutral'

const getOrderStatusColor = (status: string): UiColor => {
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
