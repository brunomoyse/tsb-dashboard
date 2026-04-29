<template>
  <div class="p-3 sm:p-4 md:p-6">
    <!-- Page Header -->
    <div class="mb-3 sm:mb-6 flex items-center justify-between gap-3">
      <div class="min-w-0">
        <h1 class="text-lg sm:text-2xl font-bold text-highlighted truncate">{{ t('coupons.title') }}</h1>
        <p class="text-xs sm:text-sm text-muted mt-0.5">{{ filteredCoupons.length }} {{ t('coupons.title').toLowerCase() }}</p>
      </div>
      <UButton
        icon="i-lucide-plus"
        size="md"
        class="sm:hidden shrink-0"
        :aria-label="t('coupons.add')"
        @click="openCreateDialog"
      />
      <UButton
        icon="i-lucide-plus"
        class="hidden sm:inline-flex"
        @click="openCreateDialog"
      >
        {{ t('coupons.add') }}
      </UButton>
    </div>

    <!-- Filters Bar (sticky on mobile) -->
    <div class="sticky top-0 z-20 -mx-3 sm:mx-0 px-3 sm:px-0 pb-3 sm:pb-4 pt-1 bg-(--ui-bg-accented) sm:static sm:bg-transparent">
      <UInput
        v-model="searchQuery"
        icon="i-lucide-search"
        :placeholder="t('coupons.search')"
        size="lg"
        class="w-full"
        :ui="{ base: 'h-12 text-base' }"
      />

      <!-- Combined chip rail: status + type -->
      <div class="relative mt-2 sm:mt-3 -mx-3 sm:mx-0 px-3 sm:px-0 flex items-center gap-2 overflow-x-auto sm:flex-wrap sm:overflow-visible scrollbar-hide">
        <button
          v-for="opt in statusFilterOptions"
          :key="`s-${opt.value}`"
          type="button"
          class="shrink-0 inline-flex items-center h-10 px-4 rounded-full text-sm font-medium border transition-all active:scale-95"
          :class="filterStatus === opt.value
            ? 'bg-(--ui-primary) text-white border-(--ui-primary) shadow-sm'
            : 'bg-(--ui-bg-elevated) text-(--ui-text-muted) border-(--ui-border)'
          "
          @click="filterStatus = opt.value as typeof filterStatus"
        >
          {{ opt.label }}
        </button>

        <span class="shrink-0 h-6 w-px bg-(--ui-border)" aria-hidden="true" />

        <button
          v-for="opt in typeFilterOptions"
          :key="`t-${opt.value}`"
          type="button"
          class="shrink-0 inline-flex items-center h-10 px-4 rounded-full text-sm font-medium border transition-all active:scale-95"
          :class="filterType === opt.value
            ? 'bg-(--ui-primary) text-white border-(--ui-primary) shadow-sm'
            : 'bg-(--ui-bg-elevated) text-(--ui-text-muted) border-(--ui-border)'
          "
          @click="filterType = opt.value as typeof filterType"
        >
          {{ opt.label }}
        </button>
        <div class="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-(--ui-bg-accented) to-transparent sm:hidden" aria-hidden="true" />
      </div>
    </div>

    <!-- ========== MOBILE VIEW: Cards (< md) ========== -->
    <div class="md:hidden">
      <!-- Skeleton -->
      <div v-if="pending" class="space-y-2">
        <div v-for="i in 6" :key="i" class="rounded-xl bg-(--ui-bg) border border-(--ui-border) overflow-hidden">
          <div class="p-3 space-y-2">
            <USkeleton class="h-4 w-24" />
            <USkeleton class="h-3 w-40" />
            <USkeleton class="h-3 w-32" />
          </div>
          <USkeleton class="h-11 rounded-none border-t border-(--ui-border)" />
        </div>
      </div>

      <!-- Empty -->
      <div
        v-else-if="filteredCoupons.length === 0"
        class="flex flex-col items-center justify-center py-16 px-6 text-center rounded-xl bg-(--ui-bg) border border-(--ui-border)"
      >
        <UIcon name="i-lucide-ticket" class="size-14 mb-3 text-muted" />
        <p class="text-muted text-sm">{{ t('coupons.noResults') }}</p>
      </div>

      <!-- Cards -->
      <div v-else class="space-y-2">
        <div
          v-for="coupon in filteredCoupons"
          :key="coupon.id"
          class="rounded-xl bg-(--ui-bg) border border-(--ui-border) overflow-hidden"
        >
          <button
            type="button"
            class="w-full p-3 text-left active:bg-(--ui-bg-elevated) transition-colors"
            @click="openEditDialog(coupon)"
          >
            <!-- Top row: code + discount -->
            <div class="flex items-center justify-between gap-3">
              <span class="font-mono text-sm font-bold text-highlighted truncate">{{ coupon.code }}</span>
              <span class="font-bold text-base text-(--ui-primary) shrink-0 tabular-nums">
                {{ coupon.discountType === 'PERCENTAGE'
                  ? `-${coupon.discountValue}%`
                  : `-${belPriceFormat.format(Number(coupon.discountValue))}`
                }}
              </span>
            </div>

            <!-- Meta row -->
            <div class="mt-1.5 flex items-center gap-3 text-xs text-muted">
              <span class="inline-flex items-center gap-1">
                <UIcon name="i-lucide-users" class="size-3.5" />
                <span class="tabular-nums">{{ coupon.usedCount }} / {{ coupon.maxUses ?? '∞' }}</span>
              </span>
              <span v-if="coupon.minOrderAmount" class="inline-flex items-center gap-1">
                <UIcon name="i-lucide-shopping-cart" class="size-3.5" />
                <span class="tabular-nums">{{ belPriceFormat.format(Number(coupon.minOrderAmount)) }}</span>
              </span>
            </div>

            <!-- Validity row -->
            <div class="mt-1.5 flex items-center gap-2 text-xs">
              <UIcon name="i-lucide-calendar" class="size-3.5 text-muted" />
              <span class="text-muted truncate">{{ formatDateRange(coupon.validFrom, coupon.validUntil) }}</span>
            </div>
          </button>

          <!-- Status pill (clickable when admin can toggle, read-only otherwise) -->
          <button
            type="button"
            class="w-full flex items-center justify-center gap-1.5 h-12 text-sm font-medium border-t border-(--ui-border) transition-colors active:scale-[0.99] disabled:cursor-not-allowed"
            :class="statusMeta(coupon.status).tone"
            :disabled="togglingId === coupon.id || (coupon.status !== 'ACTIVE' && coupon.status !== 'INACTIVE')"
            :aria-pressed="coupon.status === 'ACTIVE'"
            @click="toggleActive(coupon)"
          >
            <UIcon
              :name="togglingId === coupon.id ? 'i-lucide-loader-2' : statusMeta(coupon.status).icon"
              class="size-4"
              :class="{ 'animate-spin': togglingId === coupon.id }"
            />
            {{ statusMeta(coupon.status).label }}
          </button>
        </div>
      </div>
    </div>

    <!-- ========== TABLET+ VIEW: Table (md+) ========== -->
    <div class="hidden md:block rounded-xl border border-(--ui-border) overflow-hidden bg-(--ui-bg)">
      <UTable
        v-if="!pending && filteredCoupons.length > 0"
        :columns="columns"
        :data="paginatedCoupons"
        :ui="{
          th: 'text-xs font-semibold uppercase tracking-wider text-(--ui-text-muted) py-3 px-4',
          td: 'py-3 px-4'
        }"
        @select="(_e: Event, row: any) => openEditDialog(row.original)"
      >
        <template #code-cell="{ row }">
          <span class="font-mono font-medium">{{ row.original.code }}</span>
        </template>

        <template #discountType-cell="{ row }">
          <span class="text-sm">{{ row.original.discountType === 'PERCENTAGE' ? t('coupons.percentage') : t('coupons.fixed') }}</span>
        </template>

        <template #discountValue-cell="{ row }">
          <span class="text-sm font-semibold tabular-nums">
            {{ row.original.discountType === 'PERCENTAGE'
              ? `${row.original.discountValue}%`
              : belPriceFormat.format(Number(row.original.discountValue))
            }}
          </span>
        </template>

        <template #minOrderAmount-cell="{ row }">
          <span class="text-sm tabular-nums text-muted">
            {{ row.original.minOrderAmount
              ? belPriceFormat.format(Number(row.original.minOrderAmount))
              : '-'
            }}
          </span>
        </template>

        <template #maxUses-cell="{ row }">
          <span class="text-sm tabular-nums text-muted">
            {{ row.original.usedCount }} / {{ row.original.maxUses ?? t('coupons.unlimited') }}
          </span>
        </template>

        <template #maxUsesPerUser-cell="{ row }">
          <span class="text-sm tabular-nums text-muted">{{ row.original.maxUsesPerUser ?? t('coupons.unlimited') }}</span>
        </template>

        <template #isActive-cell="{ row }">
          <button
            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border active:scale-95 cursor-pointer disabled:cursor-not-allowed"
            :class="[statusMeta(row.original.status).tone, 'border-transparent']"
            :disabled="togglingId === row.original.id || (row.original.status !== 'ACTIVE' && row.original.status !== 'INACTIVE')"
            @click.stop="toggleActive(row.original)"
          >
            <UIcon
              :name="togglingId === row.original.id ? 'i-lucide-loader-2' : statusMeta(row.original.status).icon"
              class="size-3.5"
              :class="{ 'animate-spin': togglingId === row.original.id }"
            />
            {{ statusMeta(row.original.status).label }}
          </button>
        </template>

        <template #validPeriod-cell="{ row }">
          <span class="text-sm text-muted">
            {{ formatDateRange(row.original.validFrom, row.original.validUntil) }}
          </span>
        </template>

        <template #actions-cell="{ row }">
          <div class="flex justify-end">
            <UButton
              icon="i-lucide-pencil"
              size="sm"
              color="neutral"
              variant="ghost"
              @click.stop="openEditDialog(row.original)"
            />
          </div>
        </template>
      </UTable>

      <!-- Skeleton Loading -->
      <div v-if="pending" class="divide-y divide-(--ui-border)">
        <div v-for="i in 8" :key="i" class="flex items-center gap-4 px-4 py-3">
          <div class="flex-1 space-y-1.5">
            <USkeleton class="h-3.5 w-24" />
          </div>
          <USkeleton class="h-3.5 w-16 hidden sm:block" />
          <USkeleton class="h-3.5 w-16 hidden sm:block" />
          <USkeleton class="h-6 w-20 rounded-full hidden md:block" />
          <USkeleton class="h-3.5 w-24 hidden lg:block" />
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="!pending && filteredCoupons.length === 0" class="flex flex-col items-center justify-center py-16">
        <UIcon name="i-lucide-ticket" class="size-12 mb-3 text-muted" />
        <p class="text-muted text-sm">{{ t('coupons.noResults') }}</p>
      </div>

      <!-- Pagination -->
      <div v-if="!pending && filteredCoupons.length > pageSize" class="flex justify-center py-4 border-t border-(--ui-border)">
        <UPagination
          v-model:page="page"
          :total="filteredCoupons.length"
          :items-per-page="pageSize"
          show-edges
        />
      </div>
    </div>
  </div>

  <!-- Modals -->
  <Teleport to="body">
    <UModal v-model:open="showDialog">
      <template #content>
        <div class="p-6 space-y-4">
          <h2 class="text-xl font-bold">
            {{ isEditing ? t('coupons.editTitle') : t('coupons.createTitle') }}
          </h2>

          <div class="space-y-4">
            <!-- Code -->
            <div>
              <label class="block text-sm font-medium mb-1">{{ t('coupons.code') }}</label>
              <UInput v-model="form.code" :placeholder="t('coupons.code')" />
            </div>

            <!-- Discount Type -->
            <div>
              <label class="block text-sm font-medium mb-1">{{ t('coupons.type') }}</label>
              <USelectMenu
                v-model="form.discountType"
                :items="discountTypeOptions"
                value-key="value"
              />
            </div>

            <!-- Discount Value -->
            <div>
              <label class="block text-sm font-medium mb-1">{{ t('coupons.value') }}</label>
              <UInput v-model="form.discountValue" type="number" step="0.01" min="0" />
            </div>

            <!-- Min Order Amount -->
            <div>
              <label class="block text-sm font-medium mb-1">{{ t('coupons.minOrder') }}</label>
              <UInput v-model="form.minOrderAmount" type="number" step="0.01" min="0" placeholder="0.00" />
            </div>

            <!-- Max Uses -->
            <div>
              <label class="block text-sm font-medium mb-1">{{ t('coupons.maxUses') }}</label>
              <UInput v-model="form.maxUses" type="number" min="0" :placeholder="t('coupons.unlimited')" />
            </div>

            <!-- Max Uses Per User -->
            <div>
              <label class="block text-sm font-medium mb-1">{{ t('coupons.maxUsesPerUser') }}</label>
              <UInput v-model="form.maxUsesPerUser" type="number" min="0" :placeholder="t('coupons.unlimited')" />
            </div>

            <!-- Active -->
            <div class="flex items-center gap-2">
              <UCheckbox v-model="form.isActive" />
              <label class="text-sm font-medium">{{ t('coupons.active') }}</label>
            </div>

            <!-- Valid From -->
            <div>
              <label class="block text-sm font-medium mb-1">{{ t('coupons.validFrom') }}</label>
              <UInput v-model="form.validFrom" type="datetime-local" />
            </div>

            <!-- Valid Until -->
            <div>
              <label class="block text-sm font-medium mb-1">{{ t('coupons.validUntil') }}</label>
              <UInput v-model="form.validUntil" type="datetime-local" />
            </div>
          </div>

          <!-- Validation error -->
          <p v-if="validationError" class="text-sm text-red-500">{{ validationError }}</p>

          <!-- Actions -->
          <div class="flex justify-end gap-2 pt-4">
            <UButton color="neutral" variant="ghost" @click="showDialog = false">
              {{ t('common.cancel') }}
            </UButton>
            <UButton @click="handleSubmit" :loading="isSaving">
              {{ isEditing ? t('common.save') : t('common.create') }}
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </Teleport>
</template>

<script lang="ts" setup>
import type { Coupon, CreateCouponInput, UpdateCouponInput } from '~/types'
import { computed, ref, watch } from 'vue'
import { useGqlMutation, useGqlQuery, useGqlSubscription } from '#imports'
import gql from 'graphql-tag'
import { print } from 'graphql'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const toast = useToast()

const belPriceFormat = new Intl.NumberFormat('fr-BE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  style: 'currency',
  currency: 'EUR'
})

const searchQuery = ref('')
const filterStatus = ref<'all' | 'active' | 'inactive'>('all')
const filterType = ref<'all' | 'PERCENTAGE' | 'FIXED'>('all')
const page = ref(1)
const pageSize = ref(10)

// Table columns (same pattern as products page)
const columns = computed(() => [
  { accessorKey: 'code', header: t('coupons.code') },
  { accessorKey: 'discountType', header: t('coupons.type'), meta: { class: { td: 'hidden sm:table-cell', th: 'hidden sm:table-cell' } } },
  { accessorKey: 'discountValue', header: t('coupons.value') },
  { accessorKey: 'minOrderAmount', header: t('coupons.minOrder'), meta: { class: { td: 'hidden lg:table-cell', th: 'hidden lg:table-cell' } } },
  { accessorKey: 'maxUses', header: `${t('coupons.used')} / ${t('coupons.maxUses')}`, meta: { class: { td: 'hidden lg:table-cell', th: 'hidden lg:table-cell' } } },
  { accessorKey: 'maxUsesPerUser', header: t('coupons.maxUsesPerUser'), meta: { class: { td: 'hidden lg:table-cell', th: 'hidden lg:table-cell' } } },
  { accessorKey: 'isActive', header: t('coupons.active'), meta: { class: { td: 'hidden md:table-cell', th: 'hidden md:table-cell' } } },
  { accessorKey: 'validPeriod', header: t('coupons.validUntil'), enableSorting: false, meta: { class: { td: 'hidden xl:table-cell', th: 'hidden xl:table-cell' } } },
  { accessorKey: 'actions', header: '', enableSorting: false }
])

const COUPONS_QUERY = gql`
  query {
    coupons {
      id
      code
      discountType
      discountValue
      minOrderAmount
      maxUses
      maxUsesPerUser
      usedCount
      isActive
      status
      validFrom
      validUntil
      createdAt
    }
  }
`

const CREATE_COUPON_MUTATION = gql`
  mutation ($input: CreateCouponInput!) {
    createCoupon(input: $input) {
      id
      code
      discountType
      discountValue
      minOrderAmount
      maxUses
      maxUsesPerUser
      usedCount
      isActive
      status
      validFrom
      validUntil
      createdAt
    }
  }
`

const UPDATE_COUPON_MUTATION = gql`
  mutation ($id: ID!, $input: UpdateCouponInput!) {
    updateCoupon(id: $id, input: $input) {
      id
      code
      discountType
      discountValue
      minOrderAmount
      maxUses
      maxUsesPerUser
      usedCount
      isActive
      status
      validFrom
      validUntil
      createdAt
    }
  }
`

const TOGGLE_COUPON_MUTATION = gql`
  mutation ($id: ID!, $input: UpdateCouponInput!) {
    updateCoupon(id: $id, input: $input) {
      id
      isActive
      status
    }
  }
`

const SUB_COUPON_UPDATED = gql`
  subscription CouponUpdated {
    couponUpdated {
      id
      code
      discountType
      discountValue
      minOrderAmount
      maxUses
      maxUsesPerUser
      usedCount
      isActive
      status
      validFrom
      validUntil
      createdAt
    }
  }
`

const { data: dataCoupons, pending } = await useGqlQuery<{ coupons: Coupon[] }>(
  print(COUPONS_QUERY),
  {},
  { immediate: true, cache: true }
)

const coupons = computed(() => dataCoupons.value?.coupons ?? [])

const filteredCoupons = computed(() => coupons.value.filter(c => {
  if (searchQuery.value && !c.code.toLowerCase().includes(searchQuery.value.toLowerCase())) return false
  if (filterStatus.value === 'active' && c.status !== 'ACTIVE') return false
  if (filterStatus.value === 'inactive' && c.status === 'ACTIVE') return false
  if (filterType.value !== 'all' && c.discountType !== filterType.value) return false
  return true
}))

const statusMeta = (status: Coupon['status']) => {
  switch (status) {
    case 'ACTIVE':
      return { label: t('coupons.active'), icon: 'i-lucide-circle-check', tone: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' }
    case 'INACTIVE':
      return { label: t('coupons.inactive'), icon: 'i-lucide-circle-x', tone: 'text-(--ui-text-muted) opacity-70' }
    case 'EXPIRED':
      return { label: t('coupons.expired'), icon: 'i-lucide-clock-alert', tone: 'bg-red-500/10 text-red-700 dark:text-red-400' }
    case 'SCHEDULED':
      return { label: t('coupons.scheduled'), icon: 'i-lucide-calendar-clock', tone: 'bg-blue-500/10 text-blue-700 dark:text-blue-400' }
    case 'EXHAUSTED':
      return { label: t('coupons.exhausted'), icon: 'i-lucide-battery-low', tone: 'bg-[#D08A2E]/10 text-[#D08A2E] dark:text-[#E5A852]' }
  }
}

const paginatedCoupons = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredCoupons.value.slice(start, start + pageSize.value)
})

watch([searchQuery, filterStatus, filterType], () => { page.value = 1 })

// Inline toggle state
const togglingId = ref<string | null>(null)

const toggleActive = async (coupon: Coupon) => {
  togglingId.value = coupon.id
  try {
    const { mutate } = useGqlMutation<{ updateCoupon: Coupon }>(TOGGLE_COUPON_MUTATION)
    const res = await mutate({ id: coupon.id, input: { isActive: !coupon.isActive } })

    if (dataCoupons.value?.coupons) {
      const idx = dataCoupons.value.coupons.findIndex(c => c.id === coupon.id)
      if (idx !== -1) {
        dataCoupons.value.coupons.splice(idx, 1, { ...dataCoupons.value.coupons[idx], ...res.updateCoupon })
      }
    }
  } catch {
    toast.add({ title: t('orders.errors.updateFailed'), color: 'error' })
  } finally {
    togglingId.value = null
  }
}

// Dialog state
const showDialog = ref(false)
const isEditing = ref(false)
const editingCouponId = ref<string | null>(null)
const isSaving = ref(false)
const validationError = ref('')

const discountTypeOptions = computed(() => [
  { label: t('coupons.percentage'), value: 'PERCENTAGE' },
  { label: t('coupons.fixed'), value: 'FIXED' }
])

const statusFilterOptions = computed(() => [
  { label: t('orderHistory.allTypes'), value: 'all' },
  { label: t('coupons.active'), value: 'active' },
  { label: t('coupons.inactive'), value: 'inactive' }
])

const typeFilterOptions = computed(() => [
  { label: t('orderHistory.allTypes'), value: 'all' },
  { label: t('coupons.percentage'), value: 'PERCENTAGE' },
  { label: t('coupons.fixed'), value: 'FIXED' }
])

const defaultForm = () => ({
  code: '',
  discountType: 'PERCENTAGE' as string,
  discountValue: '',
  minOrderAmount: '',
  maxUses: '',
  maxUsesPerUser: '',
  isActive: true,
  validFrom: '',
  validUntil: ''
})

const form = ref(defaultForm())

const openCreateDialog = () => {
  isEditing.value = false
  editingCouponId.value = null
  form.value = defaultForm()
  validationError.value = ''
  showDialog.value = true
}

const formatDateRange = (from: string | null, until: string | null) => {
  const fmt = (d: string) => new Date(d).toLocaleDateString()
  if (from && until) return `${fmt(from)} - ${fmt(until)}`
  if (from) return `${fmt(from)} -`
  if (until) return `- ${fmt(until)}`
  return '-'
}

const toLocalDatetime = (iso: string | null) => {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const openEditDialog = (coupon: Coupon) => {
  isEditing.value = true
  editingCouponId.value = coupon.id
  form.value = {
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    minOrderAmount: coupon.minOrderAmount ?? '',
    maxUses: coupon.maxUses !== null && coupon.maxUses !== undefined ? String(coupon.maxUses) : '',
    maxUsesPerUser: coupon.maxUsesPerUser !== null && coupon.maxUsesPerUser !== undefined ? String(coupon.maxUsesPerUser) : '',
    isActive: coupon.isActive,
    validFrom: toLocalDatetime(coupon.validFrom),
    validUntil: toLocalDatetime(coupon.validUntil)
  }
  validationError.value = ''
  showDialog.value = true
}

const validate = (): boolean => {
  if (!form.value.code.trim()) {
    validationError.value = `${t('coupons.code')} is required`
    return false
  }
  const val = Number(form.value.discountValue)
  if (!form.value.discountValue || isNaN(val) || val <= 0) {
    validationError.value = `${t('coupons.value')} must be greater than 0`
    return false
  }
  if (form.value.validFrom && form.value.validUntil) {
    if (new Date(form.value.validUntil) <= new Date(form.value.validFrom)) {
      validationError.value = `${t('coupons.validUntil')} must be after ${t('coupons.validFrom')}`
      return false
    }
  }
  validationError.value = ''
  return true
}

const handleSubmit = async () => {
  if (!validate()) return
  isSaving.value = true

  try {
    if (isEditing.value && editingCouponId.value) {
      const input: UpdateCouponInput = {
        code: form.value.code.trim().toUpperCase(),
        discountType: form.value.discountType,
        discountValue: form.value.discountValue,
        minOrderAmount: form.value.minOrderAmount ? String(form.value.minOrderAmount) : null,
        maxUses: form.value.maxUses ? Number(form.value.maxUses) : null,
        maxUsesPerUser: form.value.maxUsesPerUser ? Number(form.value.maxUsesPerUser) : null,
        isActive: form.value.isActive,
        validFrom: form.value.validFrom ? new Date(form.value.validFrom).toISOString() : null,
        validUntil: form.value.validUntil ? new Date(form.value.validUntil).toISOString() : null
      }

      const { mutate } = useGqlMutation<{ updateCoupon: Coupon }>(UPDATE_COUPON_MUTATION)
      const res = await mutate({ id: editingCouponId.value, input })

      if (dataCoupons.value?.coupons) {
        dataCoupons.value = {
          ...dataCoupons.value,
          coupons: dataCoupons.value.coupons.map(c =>
            c.id === res.updateCoupon.id ? res.updateCoupon : c
          )
        }
      }
    } else {
      const input: CreateCouponInput = {
        code: form.value.code.trim().toUpperCase(),
        discountType: form.value.discountType,
        discountValue: form.value.discountValue,
        minOrderAmount: form.value.minOrderAmount ? String(form.value.minOrderAmount) : null,
        maxUses: form.value.maxUses ? Number(form.value.maxUses) : null,
        maxUsesPerUser: form.value.maxUsesPerUser ? Number(form.value.maxUsesPerUser) : null,
        isActive: form.value.isActive,
        validFrom: form.value.validFrom ? new Date(form.value.validFrom).toISOString() : null,
        validUntil: form.value.validUntil ? new Date(form.value.validUntil).toISOString() : null
      }

      const { mutate } = useGqlMutation<{ createCoupon: Coupon }>(CREATE_COUPON_MUTATION)
      const res = await mutate({ input })

      dataCoupons.value = {
        ...dataCoupons.value,
        coupons: [res.createCoupon, ...(dataCoupons.value?.coupons ?? [])]
      }
    }

    showDialog.value = false
  } catch (err) {
    if (import.meta.dev) console.error('Coupon save failed:', err)
  } finally {
    isSaving.value = false
  }
}

// Subscribe in setup so onScopeDispose ties to the component scope; in onMounted it leaks the WebSocket.
const { data: liveCoupon } = useGqlSubscription<{ couponUpdated: Coupon }>(
  print(SUB_COUPON_UPDATED)
)
watch(liveCoupon, (val) => {
  if (!val?.couponUpdated?.id || !dataCoupons.value?.coupons) return
  const idx = dataCoupons.value.coupons.findIndex(c => c.id === val.couponUpdated.id)
  if (idx === -1) {
    dataCoupons.value.coupons.unshift(val.couponUpdated)
  } else {
    dataCoupons.value.coupons.splice(idx, 1, val.couponUpdated)
  }
})
</script>
