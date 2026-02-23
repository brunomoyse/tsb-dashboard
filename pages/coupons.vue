<template>
  <div class="p-4 sm:p-6">
    <!-- Page Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-highlighted">{{ t('coupons.title') }}</h1>
      </div>
      <div class="flex gap-2">
        <UButton
          icon="i-lucide-plus"
          @click="openCreateDialog"
        >
          {{ t('coupons.add') }}
        </UButton>
      </div>
    </div>

    <!-- Search Bar -->
    <div class="mb-4">
      <UInput
        v-model="searchQuery"
        icon="i-lucide-search"
        :placeholder="t('coupons.search')"
        size="lg"
      />
    </div>

    <!-- Coupons Table -->
    <UTable
      v-if="filteredCoupons.length > 0"
      :columns="columns"
      :data="paginatedCoupons"
    >
      <template #code-cell="{ cell }">
        <span class="font-mono font-medium">{{ cell.row.original.code }}</span>
      </template>

      <template #discountType-cell="{ cell }">
        {{ cell.row.original.discountType === 'PERCENTAGE' ? t('coupons.percentage') : t('coupons.fixed') }}
      </template>

      <template #discountValue-cell="{ cell }">
        {{ cell.row.original.discountType === 'PERCENTAGE'
          ? `${cell.row.original.discountValue}%`
          : belPriceFormat.format(Number(cell.row.original.discountValue))
        }}
      </template>

      <template #minOrderAmount-cell="{ cell }">
        {{ cell.row.original.minOrderAmount
          ? belPriceFormat.format(Number(cell.row.original.minOrderAmount))
          : '-'
        }}
      </template>

      <template #maxUses-cell="{ cell }">
        {{ cell.row.original.maxUses ?? t('coupons.unlimited') }}
      </template>

      <template #usedCount-cell="{ cell }">
        {{ cell.row.original.usedCount }}
      </template>

      <template #isActive-cell="{ cell }">
        <UBadge
          :color="cell.row.original.isActive ? 'success' : 'error'"
          variant="soft"
          size="sm"
        >
          {{ cell.row.original.isActive ? t('common.available') : t('common.unavailable') }}
        </UBadge>
      </template>

      <template #validPeriod-cell="{ cell }">
        <span class="text-sm">
          {{ formatDateRange(cell.row.original.validFrom, cell.row.original.validUntil) }}
        </span>
      </template>

      <template #actions-cell="{ cell }">
        <div class="flex justify-end">
          <UButton
            icon="i-lucide-pencil"
            size="md"
            color="neutral"
            variant="ghost"
            @click="openEditDialog(cell.row.original)"
          />
        </div>
      </template>
    </UTable>

    <!-- Pagination -->
    <div v-if="filteredCoupons.length > pageSize" class="flex justify-center mt-6">
      <UPagination
        v-model:page="page"
        :total="filteredCoupons.length"
        :items-per-page="pageSize"
        show-edges
      />
    </div>

    <!-- Empty State -->
    <UCard v-else-if="filteredCoupons.length === 0" class="text-center py-12">
      <UIcon name="i-lucide-ticket" class="size-16 mx-auto mb-4 text-muted" />
      <p class="text-lg text-muted">{{ t('coupons.noResults') }}</p>
    </UCard>
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
import { ref, computed, watch } from 'vue'
import { useGqlQuery, useGqlMutation } from '#imports'
import { useI18n } from 'vue-i18n'
import type { Coupon, CreateCouponInput, UpdateCouponInput } from '~/types'
import gql from 'graphql-tag'
import { print } from 'graphql'

const { t } = useI18n()

const belPriceFormat = new Intl.NumberFormat('fr-BE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  style: 'currency',
  currency: 'EUR'
})

const columns = [
  { id: 'code', key: 'code', label: t('coupons.code') },
  { id: 'discountType', key: 'discountType', label: t('coupons.type') },
  { id: 'discountValue', key: 'discountValue', label: t('coupons.value') },
  { id: 'minOrderAmount', key: 'minOrderAmount', label: t('coupons.minOrder') },
  { id: 'maxUses', key: 'maxUses', label: t('coupons.maxUses') },
  { id: 'usedCount', key: 'usedCount', label: t('coupons.used') },
  { id: 'isActive', key: 'isActive', label: t('coupons.active') },
  { id: 'validPeriod', key: 'validPeriod', label: t('coupons.validUntil'), sortable: false },
  { id: 'actions', key: 'actions', label: t('common.actions'), sortable: false }
]

const searchQuery = ref('')
const page = ref(1)
const pageSize = ref(10)

const COUPONS_QUERY = gql`
  query {
    coupons {
      id
      code
      discountType
      discountValue
      minOrderAmount
      maxUses
      usedCount
      isActive
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
      usedCount
      isActive
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
      usedCount
      isActive
      validFrom
      validUntil
      createdAt
    }
  }
`

const { data: dataCoupons } = await useGqlQuery<{ coupons: Coupon[] }>(
  print(COUPONS_QUERY),
  {},
  { immediate: true, cache: true }
)

const coupons = computed(() => dataCoupons.value?.coupons ?? [])

const filteredCoupons = computed(() => {
  if (!searchQuery.value) return coupons.value
  const query = searchQuery.value.toLowerCase()
  return coupons.value.filter(c => c.code.toLowerCase().includes(query))
})

const paginatedCoupons = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredCoupons.value.slice(start, start + pageSize.value)
})

watch(searchQuery, () => { page.value = 1 })

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

const defaultForm = () => ({
  code: '',
  discountType: 'PERCENTAGE' as string,
  discountValue: '',
  minOrderAmount: '',
  maxUses: '' as string | number,
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
    maxUses: coupon.maxUses ?? '',
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
        isActive: form.value.isActive,
        validFrom: form.value.validFrom ? new Date(form.value.validFrom).toISOString() : null,
        validUntil: form.value.validUntil ? new Date(form.value.validUntil).toISOString() : null
      }

      const { mutate } = useGqlMutation<{ updateCoupon: Coupon }>(UPDATE_COUPON_MUTATION)
      const res = await mutate({ id: editingCouponId.value, input })

      if (dataCoupons.value?.coupons) {
        const idx = dataCoupons.value.coupons.findIndex(c => c.id === res.updateCoupon.id)
        if (idx !== -1) {
          dataCoupons.value.coupons.splice(idx, 1, res.updateCoupon)
        }
      }
    } else {
      const input: CreateCouponInput = {
        code: form.value.code.trim().toUpperCase(),
        discountType: form.value.discountType,
        discountValue: form.value.discountValue,
        minOrderAmount: form.value.minOrderAmount ? String(form.value.minOrderAmount) : null,
        maxUses: form.value.maxUses ? Number(form.value.maxUses) : null,
        isActive: form.value.isActive,
        validFrom: form.value.validFrom ? new Date(form.value.validFrom).toISOString() : null,
        validUntil: form.value.validUntil ? new Date(form.value.validUntil).toISOString() : null
      }

      const { mutate } = useGqlMutation<{ createCoupon: Coupon }>(CREATE_COUPON_MUTATION)
      const res = await mutate({ input })

      if (dataCoupons.value?.coupons) {
        dataCoupons.value.coupons.unshift(res.createCoupon)
      }
    }

    showDialog.value = false
  } catch (err) {
    console.error('Coupon save failed:', err)
  } finally {
    isSaving.value = false
  }
}
</script>
