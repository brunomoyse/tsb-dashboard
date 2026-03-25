<template>
  <div class="p-4 sm:p-6">
    <!-- Page Header -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-highlighted">{{ t('customers.title') }}</h1>
      <p class="text-sm text-muted mt-0.5">{{ t('customers.subtitle') }}</p>
    </div>

    <!-- Summary Cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
              <template v-if="pending">
                <USkeleton class="h-5 w-16 mt-1" />
              </template>
              <template v-else>{{ card.value }}</template>
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Search Bar -->
    <div class="mb-4">
      <UInput
        v-model="searchQuery"
        icon="i-lucide-search"
        :placeholder="t('customers.search')"
        size="lg"
        class="flex-1"
      />
    </div>

    <!-- Data Table -->
    <div class="rounded-xl border border-(--ui-border) overflow-hidden bg-(--ui-bg)">
      <UTable
        v-if="!pending && filteredCustomers.length > 0"
        :columns="columns"
        :data="paginatedCustomers"
        :ui="{
          th: 'text-xs font-semibold uppercase tracking-wider text-(--ui-text-muted) py-3 px-4',
          td: 'py-3 px-4'
        }"
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
  </div>
</template>

<script lang="ts" setup>
import type { CustomerStatsResponse } from '~/types'
import { computed, ref, watch } from 'vue'
import { print } from 'graphql'
import { useGqlQuery } from '#imports'
import { useI18n } from 'vue-i18n'
import gql from 'graphql-tag'

const { t } = useI18n()

const belPriceFormat = new Intl.NumberFormat('fr-BE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  style: 'currency',
  currency: 'EUR'
})

const searchQuery = ref('')
const page = ref(1)
const pageSize = ref(20)

const CUSTOMER_STATS_QUERY = gql`
  query {
    customerStats {
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

const { data, pending } = await useGqlQuery<{ customerStats: CustomerStatsResponse }>(
  print(CUSTOMER_STATS_QUERY),
  {},
  { immediate: true, cache: true }
)

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
</script>
